import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Exercise the actual TypeScript client against a local HTTP server. All tokens
// and identities below are invented; this audit needs no running Demo backend.
const directory = await mkdtemp(join(tmpdir(), "futureai-client-audit-"));
const handlers = new Map();
const server = createServer((request, response) => {
  const handler = handlers.get(request.headers.authorization);
  if (!handler) { response.writeHead(500); response.end("Unexpected audit request"); return; }
  Promise.resolve(handler(request, response)).catch(() => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (response, payload, status = 200) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
};
const unauthorized = {
  error: { code: "UNAUTHORIZED", message: "Expired test session", retryable: false },
};
const identity = (role) => ({
  expires_at: "2099-01-01T00:00:00Z",
  runtime_mode: "offline_demo",
  session: { user_id: `test-${role}`, role, display_name: role, scope_label: null },
});
const viewIdentity = (role) => ({
  expiresAt: "2099-01-01T00:00:00Z",
  runtimeMode: "offline_demo",
  session: { userId: `test-${role}`, role, displayName: role, scopeLabel: null },
});
function gatedResponse() {
  let release;
  let reached;
  const gate = new Promise((resolve) => { release = resolve; });
  const arrived = new Promise((resolve) => { reached = resolve; });
  return { release, arrived, wait: async () => { reached(); await gate; } };
}
let passed = 0;
async function check(name, run) {
  let timer;
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Audit timed out: ${name}`)), 10_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  passed += 1;
  console.log(`PASS ${name}`);
}

try {
  for (const name of ["client", "adapters", "agent", "auth"]) {
    const source = await readFile(new URL(`../frontend/src/api/${name}.ts`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
      .replaceAll("import.meta.env.VITE_API_URL", JSON.stringify(base))
      .replace(/from "\.\/(client|adapters|agent|auth)"/g, 'from "./$1.mjs"');
    await writeFile(join(directory, `${name}.mjs`), output);
  }
  const { apiRequest, apiBinaryRequest, apiSession } = await import(pathToFileURL(join(directory, "client.mjs")));
  const { agentApi } = await import(pathToFileURL(join(directory, "agent.mjs")));
  const { authApi } = await import(pathToFileURL(join(directory, "auth.mjs")));
  // Keep each case's handler registered for its distinct fake token. An aborted
  // HTTP request can still reach the server after the next case has started.
  const respondWith = (handler) => handlers.set(`Bearer ${apiSession.getToken()}`, handler);

  await check("current session 401 clears authentication", async () => {
    apiSession.setToken("fake-current");
    respondWith((_request, response) => json(response, unauthorized, 401));
    await assert.rejects(apiRequest("/session-check"), (error) => error.code === "UNAUTHORIZED");
    assert.equal(apiSession.getToken(), null);
  });

  await check("old session 401 cannot clear a newly signed-in session", async () => {
    const gate = gatedResponse();
    apiSession.setToken("fake-old");
    respondWith(async (_request, response) => { await gate.wait(); json(response, unauthorized, 401); });
    const pending = apiRequest("/old-request").catch((error) => error);
    await gate.arrived;
    apiSession.setToken("fake-new");
    gate.release();
    assert.equal((await pending).code, "UNAUTHORIZED");
    assert.equal(apiSession.getToken(), "fake-new");
  });

  await check("late session lookup cannot overwrite the new identity", async () => {
    const gate = gatedResponse();
    apiSession.setToken("fake-old-lookup");
    respondWith(async (_request, response) => { await gate.wait(); json(response, identity("student")); });
    const pending = authApi.getSession().catch((error) => error);
    await gate.arrived;
    apiSession.setToken("fake-new-lookup");
    apiSession.setSession(viewIdentity("teacher"));
    gate.release();
    await pending;
    assert.equal(apiSession.getToken(), "fake-new-lookup");
    assert.equal(apiSession.getSession()?.session.role, "teacher");
  });

  for (const kind of ["json", "error", "binary"]) {
    await check(`${kind} response body remains within the request deadline`, async () => {
      apiSession.setToken(`fake-timeout-${kind}`);
      respondWith(async (_request, response) => {
        response.writeHead(kind === "error" ? 503 : 200, {
          "Content-Type": kind === "binary" ? "image/png" : "application/json",
        });
        response.flushHeaders();
        await pause(120);
        response.end(kind === "binary" ? Buffer.from([137, 80, 78, 71]) : "{}");
      });
      const request = kind === "binary" ? apiBinaryRequest : apiRequest;
      await assert.rejects(request("/slow-body", { timeoutMs: 35 }), (error) => error.code === "REQUEST_TIMEOUT");
    });
  }

  const input = {
    userId: "test-student", conversationId: null, mode: "learning",
    message: "請解釋牛頓第二定律", attachmentIds: [], topic: "newton",
  };
  const answer = {
    conversation_id: "test-conversation", message_id: "test-message", response_type: "text",
    text: "A deterministic transport fixture", learning_answer: null,
    resource_recommendation: null, memory_suggestion: null, alert: null,
    sources: [], suggested_follow_ups: [], created_at: "2026-09-05T12:00:00Z", demo: true,
    usage: { period: "day", limit: 20, used: 1, reserved: 0, remaining: 19, reset_at: "2099-01-01T00:00:00Z" },
  };
  await check("shared Agent submission isolates one subscriber abort and reuses its result", async () => {
    apiSession.setToken("fake-subscriber");
    const gate = gatedResponse();
    let count = 0;
    let key;
    respondWith(async (request, response) => {
      count += 1;
      key = request.headers["idempotency-key"];
      await gate.wait();
      json(response, answer);
    });
    const action = agentApi.createSubmission(input);
    const controller = new AbortController();
    const first = agentApi.submit(action, { signal: controller.signal }).catch((error) => error);
    const second = agentApi.submit(action);
    await gate.arrived;
    controller.abort();
    assert.equal((await first).code, "REQUEST_ABORTED");
    gate.release();
    assert.equal((await second).messageId, "test-message");
    assert.equal((await agentApi.submit(action)).messageId, "test-message");
    assert.equal(count, 1);
    assert.equal(key, action.idempotencyKey);
  });

  await check("clearing the session aborts its shared Agent transport", async () => {
    apiSession.setToken("fake-clear");
    const gate = gatedResponse();
    respondWith(async (_request, response) => { await gate.wait(); json(response, answer); });
    const pending = agentApi.submit(agentApi.createSubmission(input)).catch((error) => error);
    await gate.arrived;
    apiSession.clear();
    gate.release();
    assert.equal((await pending).code, "REQUEST_ABORTED");
    assert.equal(apiSession.getToken(), null);
  });

  await check("a retried Agent action preserves the idempotency key and body", async () => {
    apiSession.setToken("fake-retry");
    const requests = [];
    respondWith(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      requests.push({ key: request.headers["idempotency-key"], body });
      if (requests.length === 1) json(response, { error: { code: "REQUEST_TIMEOUT", message: "Retry fixture", retryable: true } }, 504);
      else json(response, answer);
    });
    const action = agentApi.createSubmission(input);
    await assert.rejects(agentApi.submit(action), (error) => error.code === "REQUEST_TIMEOUT");
    assert.equal((await agentApi.submit(action)).messageId, "test-message");
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], requests[1]);
  });

  console.log(`API client audit: ${passed} passed.`);
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
