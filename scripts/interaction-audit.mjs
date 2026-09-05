import assert from "node:assert/strict";
import { chromium } from "playwright";
import { redactAuditError, recordAuditProgress, apiJson, auditBaseUrl, authenticatePage, authenticatedSession } from "./audit-helpers.mjs";

const baseUrl = await auditBaseUrl();
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;

async function run(name, path, viewport, checks) {
  if (process.env.AUDIT_CASE && !name.includes(process.env.AUDIT_CASE)) return;
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(12_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await authenticatePage(page, path === "/teacher.html" ? "teacher" : path === "/government.html" ? "government" : "student");
    if (name === "alert tabs, details, and read") {
      const { session } = await authenticatedSession();
      const profile = await apiJson(`/profile/${session.user_id}`);
      const fields = ["nickname", "grade", "region", "family_occupation", "family_type", "economic_status", "other_identities"];
      await apiJson(`/profile/${session.user_id}`, { method: "PUT", body: { ...Object.fromEntries(fields.map((key) => [key, profile[key]])), family_occupation: "farmer" } });
    }
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await checks(page);
    assert.deepEqual(errors, []);
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = await redactAuditError(error);
    failures.push({ name, message, errors });
    console.error(`FAIL ${name}: ${message}`);
  } finally {
    await recordAuditProgress("interactions", { passed, failed: failures.length, failures });
    await page.close();
  }
}

await run("home drawer and profile", "/index.html", { width: 390, height: 844 }, async (page) => {
  const identity = (await authenticatedSession()).session;
  const history = await apiJson(`/conversations?user_id=${encodeURIComponent(identity.user_id)}`);
  const resourceHistory = history.items.find((item) => item.mode === "resource");
  assert.ok(resourceHistory, "Resource history comes from the authenticated API");
  await page.getByRole("button", { name: "開啟聊天紀錄" }).click();
  await page.getByRole("textbox", { name: "搜尋聊天紀錄" }).fill(resourceHistory.title);
  await page.getByText(resourceHistory.title, { exact: true }).first().waitFor();
  const historyDialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "關閉聊天紀錄" }).click();
  await historyDialog.waitFor({ state: "hidden" });
  await page.getByText("我的", { exact: true }).click();
  const profileDialog = page.getByRole("dialog");
  await profileDialog.waitFor();
  assert.match(await profileDialog.innerText(), /關於我/);
  await page.getByRole("button", { name: "編輯資料" }).click();
  await page.getByLabel("暱稱").fill("小樹");
  await page.getByRole("button", { name: "儲存資料" }).click();
  await page.getByRole("button", { name: "編輯資料" }).waitFor();
  assert.equal(await page.getByLabel("暱稱").inputValue(), "小樹");
  assert.equal((await apiJson(`/profile/${identity.user_id}`)).nickname, "小樹", "Profile save reaches the API");
  await page.reload({ waitUntil: "networkidle" });
  if (!await page.getByRole("dialog").isVisible()) await page.getByText("我的", { exact: true }).click();
  assert.equal(await page.getByLabel("暱稱").inputValue(), "小樹", "Profile survives reload");
});

await run("learning actions and composer", "/learning-chat.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("button", { name: "我想試試" }).click();
  await page.getByText("換你試試看", { exact: true }).waitFor();
  await page.getByRole("button", { name: "再解釋一次" }).click();
  await page.getByText("換個方式想", { exact: true }).waitFor();
  await page.getByRole("textbox", { name: "輸入問題" }).fill("請解釋牛頓第二定律");
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/agent/chat");
  await page.getByRole("button", { name: "送出問題" }).click();
  assert.equal((await responsePromise).status(), 200);
  await page.getByRole("main").getByText("請解釋牛頓第二定律", { exact: true }).waitFor();
});

await run("resource recommendation details", "/resource-chat.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("button", { name: "查看需要什麼資料" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "關閉資料清單" }).click();
  await page.getByRole("button", { name: "查看政府來源" }).click();
  await page.getByRole("button", { name: "關閉政府來源" }).click();
  await page.getByRole("textbox", { name: "輸入訊息" }).fill("我要去哪裡申請？");
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/agent/chat");
  await page.getByRole("button", { name: "送出訊息" }).click();
  assert.equal((await responsePromise).status(), 200);
  await page.getByRole("main").getByText("我要去哪裡申請？", { exact: true }).waitFor();
});

await run("resource list search and modal", "/resources.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("textbox", { name: "搜尋資源或問題分類" }).fill("農業");
  await page.getByRole("button", { name: /查看農業天然災害救助詳情/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "稍後再看" }).click();
});

await run("alert tabs, details, and read", "/alerts.html", { width: 390, height: 844 }, async (page) => {
  const { session } = await authenticatedSession();
  const alertsPath = `/alerts?user_id=${session.user_id}`;
  const alert = (await apiJson(alertsPath)).items.find((item) => item.kind === "critical");
  assert.ok(alert, "The server supplies the matching important alert");
  await page.getByRole("tab", { name: /重要/ }).click();
  await page.getByRole("button", { name: `查看詳情：${alert.title}`, exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "關閉通知詳情" }).click();
  if (!alert.read_at) await page.getByRole("button", { name: `將${alert.title}標示為已讀`, exact: true }).click();
  await page.getByRole("button", { name: `${alert.title}已讀`, exact: true }).waitFor();
  assert.ok((await apiJson(alertsPath)).items.find((item) => item.alert_id === alert.alert_id).read_at);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: `${alert.title}已讀`, exact: true }).waitFor();
});

await run("teacher period and detail", "/teacher.html", { width: 1440, height: 900 }, async (page) => {
  await page.getByLabel("選擇統計期間", { exact: true }).selectOption("30d");
  await page.getByRole("navigation", { name: "教師版導覽" }).getByRole("button", { name: "學生管理", exact: true }).click();
  await page.getByRole("textbox", { name: "搜尋學生" }).fill("陳予安");
  await page.getByText("陳予安", { exact: true }).waitFor();
});

await run("government period and insight", "/government.html", { width: 1440, height: 900 }, async (page) => {
  await page.getByLabel("統計期間", { exact: true }).selectOption("30d");
  await page.getByTestId("government-kpi-資源需求").waitFor();
  await page.getByRole("button", { name: "查看趨勢" }).click();
  await page.getByRole("dialog").waitFor();
});

await browser.close();
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
