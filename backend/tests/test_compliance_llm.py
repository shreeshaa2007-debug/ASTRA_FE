"""Compliance Agent's Groq explanation layer — backend/agents/compliance/llm.py.

Nothing here calls the network by default: GroqClient is driven through a
fake HTTP opener, same convention as the Sensing Agent's GeminiClient tests
(test_sensing_agent.py). The last section is opt-in live tests against the
real Groq API (RUN_LIVE_LLM_TESTS=1 and GROQ_API_KEY set).

The one thing every test here must keep true: nothing in this module can
ever change a verdict's status, checks, or reason — it only narrates one
that tools.validate_plan() already decided (docs/agent-plan.md §12).
"""
from __future__ import annotations

import io
import json
import os
import urllib.error
from pathlib import Path

import pytest

from backend.agents.compliance.agent import ComplianceAgent
from backend.agents.compliance.llm import DEFAULT_MODEL, GroqClient, GroqResponse, GroqUnavailableError, explain_verdict, groq_configured

KEY = "TEST-GROQ-KEY-abc123"

VERDICT = {
    "status": "ESCALATED", "reason": "cost 6,000,000.00 exceeds the 5,000,000.00 approval threshold", "requires_human": True,
    "checks": [
        {"name": "supplier_permitted", "passed": True, "detail": "all suppliers permitted and available"},
        {"name": "cost_within_threshold", "passed": False, "detail": "cost 6,000,000.00 exceeds the 5,000,000.00 approval threshold"},
    ],
}


class FakeResponse:
    def __init__(self, payload):
        self._body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeHTTP:
    """Plays back `steps` in order: an Exception is raised, anything else is returned as the response body."""

    def __init__(self, *steps):
        self.steps, self.requests = list(steps), []

    def __call__(self, request, timeout=None):
        self.requests.append((request, timeout))
        step = self.steps.pop(0)
        if isinstance(step, Exception):
            raise step
        return FakeResponse(step)


def http_error(code: int, message: str = "nope") -> urllib.error.HTTPError:
    body = io.BytesIO(json.dumps({"error": {"message": message}}).encode())
    return urllib.error.HTTPError("https://example.test", code, "err", {}, body)


def reply(text: str, finish_reason: str = "stop") -> dict:
    return {"choices": [{"message": {"role": "assistant", "content": text}, "finish_reason": finish_reason}]}


def client(http: FakeHTTP, sleeps: list | None = None, **kw) -> GroqClient:
    sleeps = sleeps if sleeps is not None else []
    return GroqClient(KEY, "groq-test", opener=http, sleep=sleeps.append, backoff_seconds=1.5, max_retries=2, timeout_seconds=7, **kw)


def call(c: GroqClient) -> GroqResponse:
    return c.generate_text(system_instruction="SYS", user_text="USER")


# --------------------------------------------------------------------------- #
# GroqClient — transport, driven through a fake HTTP opener
# --------------------------------------------------------------------------- #
def test_the_request_is_a_chat_completion_and_the_key_stays_out_of_the_url_and_in_a_bearer_header():
    http = FakeHTTP(reply("all good"))
    response = call(client(http))
    request, timeout = http.requests[0]
    assert request.full_url == "https://api.groq.com/openai/v1/chat/completions"
    assert KEY not in request.full_url and request.get_header("Authorization") == f"Bearer {KEY}" and request.get_method() == "POST"
    assert request.get_header("User-agent")  # Groq's Cloudflare front door 403s the default urllib UA
    assert timeout == 7
    body = json.loads(request.data)
    assert body["model"] == "groq-test" and body["messages"] == [{"role": "system", "content": "SYS"}, {"role": "user", "content": "USER"}]
    assert (response.text, response.model, response.attempts) == ("all good", "groq-test", 1)


def test_reasoning_effort_is_sent_only_for_gpt_oss_models():
    http = FakeHTTP(reply("ok"))
    call(GroqClient(KEY, "openai/gpt-oss-20b", opener=http))
    assert json.loads(http.requests[0][0].data)["reasoning_effort"] == "low"

    http2 = FakeHTTP(reply("ok"))
    call(client(http2))  # model "groq-test" is not a gpt-oss model
    assert "reasoning_effort" not in json.loads(http2.requests[0][0].data)


def test_transient_failures_are_retried_with_growing_backoff_then_succeed():
    sleeps: list[float] = []
    http = FakeHTTP(http_error(429, "quota"), http_error(503), reply("ok"))
    response = call(client(http, sleeps))
    assert response.attempts == 3 and len(http.requests) == 3 and sleeps == [1.5, 3.0]


def test_a_network_error_and_a_timeout_are_retried():
    http = FakeHTTP(urllib.error.URLError("connection reset"), TimeoutError("timed out"), reply("ok"))
    assert call(client(http)).attempts == 3


def test_retries_are_bounded_and_the_final_error_says_so():
    http = FakeHTTP(http_error(503), http_error(503), http_error(503))
    with pytest.raises(GroqUnavailableError, match="after 3 attempts.*HTTP 503"):
        call(client(http))
    assert len(http.requests) == 3


@pytest.mark.parametrize("code", [400, 401, 403, 404])
def test_a_client_error_is_not_retried(code):
    http = FakeHTTP(http_error(code, "model not found"))
    with pytest.raises(GroqUnavailableError, match=f"HTTP {code}.*model not found"):
        call(client(http))
    assert len(http.requests) == 1


def test_the_api_key_never_appears_in_an_error_even_if_the_service_echoes_it():
    http = FakeHTTP(http_error(400, f"invalid key {KEY} supplied"))
    with pytest.raises(GroqUnavailableError) as exc:
        call(client(http))
    assert KEY not in str(exc.value) and "***" in str(exc.value)


@pytest.mark.parametrize("payload", [
    {}, {"choices": []}, {"choices": [{"message": {"content": ""}, "finish_reason": "length"}]},
    {"choices": [{"message": {"content": "   "}}]},
])
def test_a_response_with_no_usable_text_is_an_error_naming_why(payload):
    with pytest.raises(GroqUnavailableError, match="no output"):
        call(client(FakeHTTP(payload)))


def test_a_reasoning_model_that_runs_out_of_tokens_before_answering_is_reported_clearly():
    # openai/gpt-oss-* can spend its whole budget on hidden "reasoning" and leave content empty;
    # that must surface as a clear GroqUnavailableError, not a silent empty string.
    payload = {"choices": [{"message": {"content": "", "reasoning": "thinking..."}, "finish_reason": "length"}]}
    with pytest.raises(GroqUnavailableError, match="finish_reason=length"):
        call(client(FakeHTTP(payload)))


def test_from_env_reads_the_key_and_model(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", KEY)
    monkeypatch.setenv("GROQ_MODEL", "groq-custom")
    c = GroqClient.from_env(opener=FakeHTTP(reply("ok")))
    assert c.model == "groq-custom" and call(c).text == "ok"


def test_from_env_defaults_the_model_and_refuses_a_missing_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", KEY)
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    assert GroqClient.from_env().model == DEFAULT_MODEL
    monkeypatch.delenv("GROQ_API_KEY")
    with pytest.raises(GroqUnavailableError, match="GROQ_API_KEY is not set"):
        GroqClient.from_env()
    monkeypatch.setenv("GROQ_API_KEY", "")
    with pytest.raises(GroqUnavailableError, match="GROQ_API_KEY is not set"):
        GroqClient.from_env()


# --------------------------------------------------------------------------- #
# groq_configured
# --------------------------------------------------------------------------- #
def test_groq_configured_reflects_the_env():
    assert groq_configured({}) is False
    assert groq_configured({"GROQ_API_KEY": KEY}) is True


# --------------------------------------------------------------------------- #
# explain_verdict — best-effort: never raises, never changes the verdict
# --------------------------------------------------------------------------- #
def test_explain_verdict_returns_the_narration_on_success():
    fake = GroqClient(KEY, opener=FakeHTTP(reply("Escalated: cost is over the approval threshold.")))
    assert explain_verdict(VERDICT, client=fake) == "Escalated: cost is over the approval threshold."


def test_explain_verdict_sends_the_verdicts_own_facts_and_nothing_else():
    http = FakeHTTP(reply("narration"))
    explain_verdict(VERDICT, client=GroqClient(KEY, opener=http))
    sent = json.loads(json.loads(http.requests[0][0].data)["messages"][1]["content"])
    assert sent == {
        "status": "ESCALATED", "reason": VERDICT["reason"], "requires_human": True,
        "checks": [{"name": c["name"], "passed": c["passed"], "detail": c["detail"]} for c in VERDICT["checks"]],
    }


def test_explain_verdict_returns_none_with_no_key_configured(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert explain_verdict(VERDICT) is None


def test_explain_verdict_returns_none_rather_than_raise_when_groq_fails():
    fake = GroqClient(KEY, opener=FakeHTTP(http_error(500), http_error(500)), max_retries=1)
    assert explain_verdict(VERDICT, client=fake) is None


def test_explain_verdict_never_raises_even_on_a_malformed_verdict():
    assert explain_verdict({"nonsense": True}, client=GroqClient(KEY, opener=FakeHTTP(reply("ok")))) == "ok"


# --------------------------------------------------------------------------- #
# ComplianceAgent.explain_verdict — the thin wrapper other code calls
# --------------------------------------------------------------------------- #
def test_compliance_agent_explain_verdict_delegates_to_the_llm_module(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", KEY)
    http = FakeHTTP(reply("plain-English summary"))
    monkeypatch.setattr("backend.agents.compliance.llm.GroqClient.from_env", classmethod(lambda cls, **kw: GroqClient(KEY, opener=http)))
    assert ComplianceAgent().explain_verdict(VERDICT) == "plain-English summary"


def test_compliance_agent_explain_verdict_is_none_with_no_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert ComplianceAgent().explain_verdict(VERDICT) is None


# --------------------------------------------------------------------------- #
# the repo never ships a real key
# --------------------------------------------------------------------------- #
def test_the_repo_never_ships_a_real_key():
    example = Path(".env.example")
    if example.exists():
        assert "GROQ_API_KEY=\n" in example.read_text() + "\n"  # empty in the committed example


# --------------------------------------------------------------------------- #
# live — the real Groq API. Opt in: RUN_LIVE_LLM_TESTS=1 and GROQ_API_KEY set.
# --------------------------------------------------------------------------- #
live = pytest.mark.skipif(
    not (os.environ.get("RUN_LIVE_LLM_TESTS") == "1" and os.environ.get("GROQ_API_KEY")),
    reason="live LLM tests are opt-in: set RUN_LIVE_LLM_TESTS=1 and GROQ_API_KEY",
)


@live
def test_live_groq_explains_a_real_verdict_without_inventing_facts():
    text = explain_verdict(VERDICT)
    assert text and len(text) > 20 and "6,000,000" in text  # grounded in the verdict's own numbers, not paraphrased away
