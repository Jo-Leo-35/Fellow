import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { apiJson, apiRequest, auditBaseUrl, authenticatePage, redactAuditError, recordAuditProgress } from "./audit-helpers.mjs";

const base = await auditBaseUrl();
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;
await mkdir(".screenshots", { recursive: true });

async function run(name, check, width = 390) {
  if (process.env.AUDIT_CASE && !name.includes(process.env.AUDIT_CASE)) return;
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  page.setDefaultTimeout(12_000);
  const errors = [];
  const posts = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/v1\/(agent\/)?chat$/.test(new URL(request.url()).pathname)) posts.push({ path: new URL(request.url()).pathname });
  });
  try {
    await check(page, posts);
    assert.deepEqual(errors, [], "No page errors");
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = await redactAuditError(error);
    failures.push({ name, message });
    await page.screenshot({ path: `.screenshots/integration-${name}-failure.png` }).catch(() => {});
    console.error(`FAIL ${name}: ${message}`);
  } finally {
    await recordAuditProgress("integration", { passed, failed: failures.length, failures });
    await page.close();
  }
}

async function login(page, role) {
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/auth/demo/session");
  await page.goto(`${base}/${role === "student" ? "index" : role}.html`, { waitUntil: "networkidle" });
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  const result = await response.json();
  assert.equal(result.session.role, role);
  await page.getByRole("main").waitFor();
  const storage = await page.evaluate(() => ({ hasToken: Boolean(sessionStorage.getItem("futureai.demo.session-token.v1")), localValues: Object.values(localStorage) }));
  assert.equal(storage.hasToken, true);
  assert.ok(!storage.localValues.some((value) => value.includes(result.access_token)), "Session token is absent from localStorage");
  assert.ok(!page.url().includes(result.access_token), "Session token is absent from URL");
  return result;
}

try {
  for (const role of ["student", "teacher", "government"]) {
    await run(`${role}-automatic-offline-session`, async (page, posts) => {
      await login(page, role);
      if (role === "student") await page.getByText("AI 離線模式", { exact: true }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, "320px authenticated layout fits the viewport");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("main").waitFor();
      assert.equal(posts.length, 0, "Login and reload do not submit an Agent request");
    }, 320);
  }

  await run("home-image-single-submit-history-and-deltas", async (page, posts) => {
    await authenticatePage(page);
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    const beforeUsage = await apiJson("/usage");
    const beforeTeacher = await apiJson("/dashboard/teacher", { role: "teacher" });
    const beforeGovernment = await apiJson("/dashboard/government", { role: "government" });
    await page.getByRole("textbox", { name: "輸入想問的問題" }).fill("請解釋牛頓第二定律");
    await page.locator('input[type="file"]').setInputFiles({ name: "question.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGMUCehhgAEmBiSAmwMAL2wA+EtIrNMAAAAASUVORK5CYII=", "base64") });
    const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/agent/chat");
    await page.getByRole("button", { name: "送出問題", exact: true }).click();
    const response = await responsePromise;
    const answer = await response.json();
    assert.equal(response.status(), 200, answer.error?.message ?? "The submitted image and text request succeeds");
    await page.waitForURL((url) => url.searchParams.get("conversation") === answer.conversation_id);
    await page.getByRole("heading", { level: 1, name: /牛頓/ }).waitFor();
    assert.equal(posts.length, 1, "Homepage and destination share one completed submission");
    assert.equal((await apiJson("/usage")).used, beforeUsage.used + 1);
    const persisted = await apiJson(`/conversations/${answer.conversation_id}`);
    assert.equal(persisted.messages.length, 2);
    assert.equal(persisted.messages[0].attachment_ids.length, 1);
    assert.deepEqual(persisted.messages[1].sources, answer.sources);
    assert.match(await page.getByRole("main").innerText(), /離線示範無法辨識圖片內容/, "The visible answer discloses the image limitation");
    const teacher = await apiJson("/dashboard/teacher", { role: "teacher" });
    assert.equal(teacher.summary.question_count, beforeTeacher.summary.question_count + 1);
    for (const key of ["practice_count", "correct_count", "animation_observation_count", "animation_completed_count"]) assert.equal(teacher.summary[key], beforeTeacher.summary[key], `Chat does not fabricate ${key}`);
    const government = await apiJson("/dashboard/government", { role: "government" });
    assert.equal(government.totals.event_count, beforeGovernment.totals.event_count + 1);
    const afterUsage = await apiJson("/usage");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: /牛頓/ }).waitFor();
    assert.equal(posts.length, 1, "Persisted history reload is GET-only");
    assert.deepEqual(await apiJson("/usage"), afterUsage);
    const attachmentResponse = await apiRequest(`/uploads/${persisted.messages[0].attachment_ids[0]}/content`);
    assert.equal(attachmentResponse.status, 200);
    assert.equal(attachmentResponse.headers.get("Content-Type"), "image/png");
  });

  await run("teacher-materials-keep-role-without-agent", async (page, posts) => {
    await authenticatePage(page, "teacher");
    await page.goto(`${base}/teacher.html`, { waitUntil: "networkidle" });
    await page.getByRole("navigation", { name: "教師版導覽" }).getByRole("button", { name: "資源協助", exact: true }).click();
    await page.getByRole("link", { name: "開啟動畫", exact: true }).first().click();
    await page.getByRole("heading", { name: /教材預覽/ }).waitFor();
    await page.getByRole("region", { name: "教學動畫播放器" }).waitFor();
    await page.getByRole("button", { name: "教材庫", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("blockquote").first().waitFor();
    assert.equal(await dialog.locator("blockquote").count(), 18);
    await dialog.getByRole("button", { name: "關閉教材" }).click();
    const role = await page.evaluate(async () => {
      const token = sessionStorage.getItem("futureai.demo.session-token.v1");
      return (await (await fetch("/api/v1/auth/session", { headers: { Authorization: `Bearer ${token}` } })).json()).session.role;
    });
    assert.equal(role, "teacher");
    assert.equal(posts.length, 0);
    await page.goto(`${base}/chat/learning?topic=equilibrium`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /教材預覽.*化學.*平衡/ }).waitFor();
    assert.equal(posts.length, 0, "Teacher preview alias is read-only too");
    await page.goBack({ waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/teacher.html");
  }, 1440);

  await run("resource-image-disclosure-and-history", async (page, posts) => {
    await authenticatePage(page);
    await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "輸入想問的問題" }).fill("家裡菜園颱風受損，有補助嗎？");
    await page.locator('input[type="file"]').setInputFiles({ name: "resource.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGMUCehhgAEmBiSAmwMAL2wA+EtIrNMAAAAASUVORK5CYII=", "base64") });
    const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/agent/chat");
    await page.getByRole("button", { name: "送出問題", exact: true }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const answer = await response.json();
    assert.equal(answer.response_type, "resource_recommendation");
    await page.waitForURL((url) => url.pathname === "/resource-chat.html" && url.searchParams.get("conversation") === answer.conversation_id);
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.match(await page.getByRole("main").innerText(), /離線示範無法辨識圖片內容/);
    const persisted = await apiJson(`/conversations/${answer.conversation_id}`);
    assert.equal(persisted.messages[0].attachment_ids.length, 1);
    assert.deepEqual(persisted.messages[1].sources, answer.sources);
    const usage = await apiJson("/usage");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.match(await page.getByRole("main").innerText(), /離線示範無法辨識圖片內容/);
    assert.equal(posts.length, 1, "Resource image history is GET-only too");
    assert.deepEqual(await apiJson("/usage"), usage);
  });

  await run("role-switch-creates-a-new-offline-session", async (page, posts) => {
    await login(page, "student");
    await page.goto(`${base}/government.html`, { waitUntil: "networkidle" });
    await page.getByText(/此頁需要其他角色/).waitFor();
    await page.getByRole("button", { name: "切換身分", exact: true }).click();
    await page.getByRole("navigation", { name: "政府版導覽" }).waitFor();
    assert.ok(await page.evaluate(() => sessionStorage.getItem("futureai.demo.session-token.v1")));
    assert.equal(posts.length, 0);
  }, 1440);
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed, failed: failures.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
