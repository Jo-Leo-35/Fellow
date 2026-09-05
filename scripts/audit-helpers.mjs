import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const sessions = new Map();
let fixturePromise;

async function fixture() {
  fixturePromise ??= (async () => {
    const statePath = process.env.AUDIT_FIXTURE_STATE ?? ".codex-runs/integration-fixture.json";
    const state = JSON.parse(await readFile(statePath, "utf8"));
    assert.equal(state.kind, "futureai-integration-fixture-v1");
    assert.match(state.project, /^futureai-integration-[a-f0-9]{12}$/);
    const values = Object.fromEntries((await readFile(state.env_file, "utf8"))
      .split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
    return { ...state, codes: JSON.parse(values.DEMO_ACCESS_CODES) };
  })();
  return fixturePromise;
}

export async function auditBaseUrl() {
  return (process.env.BASE_URL ?? (await fixture()).base_url).replace(/\/$/, "");
}

export async function accessCodeFor(role) {
  assert.ok(["student", "teacher", "government"].includes(role), "Known audit role");
  const code = (await fixture()).codes[`${role}_demo`];
  assert.ok(typeof code === "string" && code.length > 20, "Fixture has a generated role code");
  return code;
}

export async function redactAuditError(error) {
  let message = error instanceof Error ? error.message : String(error);
  for (const code of Object.values((await fixture()).codes)) message = message.replaceAll(code, "[redacted]");
  for (const pending of sessions.values()) {
    const session = await pending.catch(() => null);
    if (session?.access_token) message = message.replaceAll(session.access_token, "[redacted]");
  }
  return message;
}

export async function recordAuditProgress(suite, result) {
  assert.match(suite, /^[a-z-]+$/);
  await mkdir(".codex-runs", { recursive: true });
  await writeFile(`.codex-runs/${suite}-progress.json`, JSON.stringify(result, null, 2));
}

export async function authenticatedSession(role = "student", { fresh = false } = {}) {
  const base = await auditBaseUrl();
  const key = `${base}/${role}`;
  if (fresh) sessions.delete(key);
  if (!sessions.has(key)) {
    sessions.set(key, (async () => {
      const response = await fetch(`${base}/api/v1/auth/demo/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: await accessCodeFor(role) }),
        signal: AbortSignal.timeout(15_000),
      });
      // Do not attach request/response bodies: exchange payloads contain secrets.
      assert.equal(response.status, 200, `Session exchange status for ${role}`);
      const session = await response.json();
      assert.equal(session.session.role, role, "Server assigns the expected role");
      assert.equal(session.runtime_mode, "offline_demo", "Fixture explicitly uses Fake Demo");
      return session;
    })());
  }
  return sessions.get(key);
}

export async function authenticatePage(page, role = "student") {
  const session = await authenticatedSession(role);
  const origin = new URL(await auditBaseUrl()).origin;
  await page.addInitScript(({ origin, token }) => {
    if (location.origin !== origin || sessionStorage.getItem("futureai.audit.initialized")) return;
    sessionStorage.setItem("futureai.demo.session-token.v1", token);
    sessionStorage.setItem("futureai.audit.initialized", "1");
  }, { origin, token: session.access_token });
  return session.session;
}

export async function apiRequest(path, { role = "student", method = "GET", body, key } = {}) {
  const session = await authenticatedSession(role);
  const headers = { Accept: "application/json", Authorization: `Bearer ${session.access_token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key) headers["Idempotency-Key"] = key;
  return fetch(`${await auditBaseUrl()}/api/v1${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(path === "/agent/chat" || path === "/chat" ? 50_000 : 15_000),
  });
}

export async function apiJson(path, options) {
  const response = await apiRequest(path, options);
  assert.ok(response.ok, `API ${options?.method ?? "GET"} ${path} returned ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function selectDashboardFilter(page, role, label, value, queryKey) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === `/api/v1/dashboard/${role}` && url.searchParams.get(queryKey) === value && response.request().method() === "GET";
  });
  await page.getByLabel(label, { exact: true }).selectOption(value);
  const response = await responsePromise;
  assert.equal(response.status(), 200, "Dashboard filter fetch succeeds");
  const data = await response.json();
  const expected = role === "teacher" ? data.summary.question_count : data.totals.resource_need_count;
  await page.waitForFunction(({ role, expected }) => {
    const element = document.querySelector(`[data-testid="${role === "teacher" ? "teacher-question-count" : "government-kpi-資源需求"}"]`);
    return element && Number(element.innerText.split("\n")[0].replaceAll(",", "")) === expected;
  }, { role, expected });
  return data;
}
