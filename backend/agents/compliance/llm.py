"""Groq transport for the Compliance Agent's explanation layer ONLY.

The compliance *decision* (APPROVED / REJECTED / ESCALATED) is made entirely
by tools.validate_plan() from backend/config/compliance_rules.yaml and never
touches this module — per docs/agent-plan.md §12's explicit "deterministic
only, no LLM in this agent" instruction. What lives here is a narrator: it
takes an already-decided verdict and turns it into a plain-English summary
for the human reviewer. It cannot flip a status, add a check, or override an
offender list — it only ever returns a string (or None). Any failure (no
key, network error, bad response) degrades to "no rationale", never to a
broken run: the deterministic verdict already stands on its own without it.

Uses Groq's OpenAI-compatible chat-completions endpoint over the standard
library, same convention as the Sensing Agent's GeminiClient
(backend/agents/sensing/llm.py) — no SDK dependency to drift.
"""
from __future__ import annotations

import json
import logging
import os
import socket
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Mapping

logger = logging.getLogger("resilientsc.compliance.llm")

GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-20b"
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}

_SYSTEM_PROMPT = (
    "You explain supply-chain compliance verdicts to a human reviewer in 2-3 plain-English "
    "sentences. The verdict (status, checks, reason) has ALREADY been decided by a deterministic "
    "rules engine before you ever see it: you are not deciding, re-checking, or second-guessing "
    "anything, only narrating the given result clearly and concisely. Never invent a check, "
    "offender, supplier, route, or number that is not present in the data you are given."
)


class GroqUnavailableError(RuntimeError):
    """Groq could not be reached or returned nothing usable."""


@dataclass(frozen=True)
class GroqResponse:
    text: str
    model: str
    latency_ms: float
    attempts: int


class GroqClient:
    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        *,
        timeout_seconds: float = 15,
        max_retries: int = 1,
        backoff_seconds: float = 1.5,
        base_url: str = GROQ_BASE_URL,
        opener: Callable[..., Any] = urllib.request.urlopen,
        sleep: Callable[[float], None] = time.sleep,
    ):
        if not api_key:
            raise GroqUnavailableError("GROQ_API_KEY is not set")
        self._api_key = api_key
        self.model = model
        self._timeout = timeout_seconds
        self._max_retries = max_retries
        self._backoff = backoff_seconds
        self._base_url = base_url
        self._opener = opener
        self._sleep = sleep

    @classmethod
    def from_env(cls, **overrides) -> "GroqClient":
        """GROQ_API_KEY (required) and GROQ_MODEL (optional) from the environment."""
        return cls(os.environ.get("GROQ_API_KEY", ""), os.environ.get("GROQ_MODEL") or DEFAULT_MODEL, **overrides)

    def generate_text(self, *, system_instruction: str, user_text: str, max_tokens: int = 350) -> GroqResponse:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_text},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }
        if "gpt-oss" in self.model:  # a reasoning model: keep its hidden reasoning short so the visible answer gets tokens
            payload["reasoning_effort"] = "low"
        body = json.dumps(payload).encode("utf-8")
        # the key travels in a header, never in the URL, so it can't end up in a log line or traceback.
        # A real User-Agent is required: Groq's Cloudflare front door 403s urllib's default
        # ("Python-urllib/3.x") as bot traffic (Cloudflare error 1010) — any descriptive UA passes,
        # same as curl's or the official groq SDK's own.
        request = urllib.request.Request(
            self._base_url, data=body, method="POST",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self._api_key}", "User-Agent": "ResilientSC-ComplianceAgent/1.0"},
        )

        started = time.perf_counter()
        last_error = "no attempt made"
        for attempt in range(1, self._max_retries + 2):
            try:
                with self._opener(request, timeout=self._timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                return GroqResponse(self._extract_text(payload), self.model, round((time.perf_counter() - started) * 1000, 1), attempt)
            except urllib.error.HTTPError as exc:
                last_error = f"HTTP {exc.code}: {self._error_message(exc)}"
                if exc.code not in _RETRYABLE_STATUS:
                    raise GroqUnavailableError(f"Groq rejected the request ({last_error})") from None
            except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as exc:
                last_error = f"network error: {self._scrub(str(getattr(exc, 'reason', exc)))}"
            except json.JSONDecodeError:
                last_error = "Groq returned a non-JSON response body"
            if attempt <= self._max_retries:
                self._sleep(self._backoff * attempt)
        raise GroqUnavailableError(f"Groq unavailable after {self._max_retries + 1} attempts (last: {last_error})")

    @staticmethod
    def _extract_text(payload: dict) -> str:
        choices = payload.get("choices") or []
        message = (choices[0].get("message") or {}) if choices else {}
        text = (message.get("content") or "").strip()
        if not text:
            finish = choices[0].get("finish_reason") if choices else None
            raise GroqUnavailableError(f"Groq returned no output (finish_reason={finish})")
        return text

    def _error_message(self, exc: urllib.error.HTTPError) -> str:
        try:
            message = json.loads(exc.read().decode("utf-8"))["error"]["message"]
        except Exception:
            message = exc.reason or "no message"
        return self._scrub(str(message))[:200]

    def _scrub(self, text: str) -> str:
        return text.replace(self._api_key, "***")


def groq_configured(env: Mapping[str, str] | None = None) -> bool:
    """Cheap check for the readiness endpoint: reads no secret, makes no call."""
    return bool((os.environ if env is None else env).get("GROQ_API_KEY"))


def explain_verdict(verdict: dict, *, client: GroqClient | None = None) -> str | None:
    """Best-effort plain-English narration of an already-decided verdict.
    Returns None — never raises — if GROQ_API_KEY isn't set or the call
    fails for any reason: the deterministic checks have already decided
    the outcome, so a missing explanation degrades the UI, not the run.
    """
    try:
        groq = client or GroqClient.from_env()
        user_text = json.dumps({
            "status": verdict.get("status"), "reason": verdict.get("reason"), "requires_human": verdict.get("requires_human"),
            "checks": [{"name": c["name"], "passed": c["passed"], "detail": c["detail"]} for c in verdict.get("checks", [])],
        })
        return groq.generate_text(system_instruction=_SYSTEM_PROMPT, user_text=user_text).text
    except GroqUnavailableError as exc:
        logger.warning("compliance explanation unavailable: %s", exc)
        return None
    except Exception:  # noqa: BLE001 — an explanation is a nice-to-have; it must never break a run the rules already decided
        logger.exception("compliance explanation failed unexpectedly")
        return None
