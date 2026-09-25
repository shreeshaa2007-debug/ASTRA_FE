// Walks the demo's golden path (docs/demo-script.md) against a RUNNING demo and saves a screenshot of every
// step to docs/demo/. They are the backup slides if the live demo fails, and a way to see at a glance that the
// path still works. Uses only Node and a local Chrome/Edge (the same dependency-free driver the E2E tests use).
//
//   python scripts/demo.py --fresh &        # in another terminal, or leave it running
//   node scripts/capture_demo.mjs [--web http://127.0.0.1:5173] [--api http://127.0.0.1:8000] [--out docs/demo] [--llm]
//
// It creates simulations in the running demo (a supplier-failure run that it approves as "Demo Presenter"), so
// point it at a demo you are happy to add to; `python scripts/demo.py --fresh` starts clean afterwards.
import { existsSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch } from '../backend/tests/e2e/browser/lib.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback; };
const WEB = arg('web', 'http://127.0.0.1:5173');
const API = arg('api', 'http://127.0.0.1:8000');
const OUT = resolve(arg('out', 'docs/demo'));
const WITH_LLM = process.argv.includes('--llm');
const APPROVER = 'Demo Presenter';

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find((p) => p && existsSync(p));
if (!CHROME) { console.error('Chrome/Edge not found: set CHROME_PATH'); process.exit(2); }

const b = await launch({ chrome: CHROME, profile: mkdtempSync(join(tmpdir(), 'demo-capture-')), port: 9400 + Math.floor(Math.random() * 500), artifacts: OUT, width: 1440, height: 900 });
const taken = [];
const shot = async (name, note) => { await b.settle(); await b.sleep(600); await b.shotFit(name); taken.push(`${name}.png  ${note}`); console.log('captured', name, '-', note); };
const need = (cond, what) => { if (!cond) throw new Error(`the demo path broke at: ${what}`); };

try {
  await b.goto(WEB);
  await b.storageClear();
  await b.goto(WEB);

  await b.settle();
  await shot('01-dashboard', 'the command center after a finished Suez run: KPIs, disrupted lanes on the map, exposure');

  await b.nav('Scenarios');
  await shot('02-scenarios-suez', 'normal operations vs. doing nothing vs. the optimized response, for the Suez closure');
  need((await b.click('Supplier Failure')) === 'ok', 'picking the supplier-failure scenario');
  await b.sleep(400);
  await shot('03-scenarios-supplier-failure', 'losing the main supplier: units at risk, what mitigation costs and buys');
  need((await b.click('Port Congestion')) === 'ok', 'picking a scenario that is not modeled');
  await shot('04-scenarios-not-modeled', 'a scenario the model cannot represent says so instead of inventing a number');

  need((await b.click('Supplier Failure')) === 'ok', 're-picking supplier failure');
  await b.sleep(400);
  await b.settle();
  need((await b.click('Run through the full pipeline')) === 'ok', 'running the scenario through the full pipeline');
  need(await b.waitFor(/AWAITING HUMAN APPROVAL/i, 90000), 'the plan reaching the human-approval gate');
  await b.sleep(1500);
  await shot('05-simulator-awaiting-approval', 'the agents ran; the plan is escalated because it exceeds the approval threshold');

  await b.nav('AI Decisions');
  need(await b.waitFor(/Compared with normal operations/i, 60000), 'the decision explanation');
  await shot('06-decision-center', 'why this plan: what the solver was never offered, the rationale, the constraints, the comparison');

  await b.nav('Compliance & Approvals');
  need(await b.waitFor(/HUMAN APPROVAL REQUIRED/i, 30000), 'the compliance verdict');
  await shot('07-compliance-pending', 'four deterministic policy checks; the cost check escalates to a named human');
  await b.type('Your name', APPROVER);
  await b.sleep(300);
  need((await b.click('APPROVE PLAN')) === 'ok', 'approving the plan');
  need(await b.waitFor(/PLAN APPROVED BY/i, 30000), 'the approval being recorded');
  await shot('08-compliance-approved', 'the human decision, named and recorded in the audit trail');

  await b.nav('Overview');
  await shot('09-dashboard-after', 'the dashboard now follows the newly finalized plan');
  await b.nav('Inventory');
  await shot('10-inventory', 'per-warehouse stock, days of cover, and the demand forecast');
  await b.nav('Sourcing');
  await shot('11-sourcing', 'suppliers, status overlay, tariffs, and the recommended mix');
  await b.nav('Logistics');
  await shot('12-logistics', 'the route network, the volume the plan puts on each route, the proposed shipments');
  await b.nav('Agent Monitor');
  need(await b.waitFor(/READINESS[\s\S]*datasets/i, 30000), 'the operations panel');
  await shot('13-agent-monitor', 'every stage, the audit trail, and the operations panel: metrics, model drift, readiness');

  if (WITH_LLM) {
    await b.nav('Disruption Simulator');
    await b.settle();
    need((await b.click('Mumbai Cyclone')) === 'ok', 'picking the cyclone report');
    need((await b.click('RUN SIMULATION')) === 'ok', 'running a free-text report');
    need(await b.waitFor(/AWAITING HUMAN APPROVAL|PIPELINE COMPLETE/i, 90000), 'the real language model sensing a free-text report');
    await b.sleep(1500);
    await shot('14-simulator-free-text', 'a free-text report read by the real language model, validated in plain code, then planned');
  }
  console.log(`\n${taken.length} screenshots in ${OUT}`);
  if (b.problems.length) console.log('console problems:\n' + b.problems.join('\n'));
} catch (err) {
  console.error(String(err.message ?? err));
  await b.shotFit('FAILED').catch(() => undefined);
  process.exitCode = 1;
} finally {
  await b.close();
}
