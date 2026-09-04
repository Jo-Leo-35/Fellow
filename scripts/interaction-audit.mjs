import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const failures = [];

async function run(name, path, viewport, checks) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await checks(page);
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error instanceof Error ? error.message : String(error), errors });
    console.error(`FAIL ${name}`);
  } finally {
    await page.close();
  }
}

await run("home drawer and profile", "/index.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("button", { name: "開啟聊天紀錄" }).click();
  await page.getByRole("textbox", { name: "搜尋聊天紀錄" }).fill("農業");
  await page.getByText("農業貸款條件是什麼？", { exact: true }).waitFor();
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
  await page.getByText("資料已更新", { exact: true }).waitFor();
});

await run("learning actions and composer", "/learning-chat.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("button", { name: "我想試試" }).click();
  await page.getByText("換你試試看", { exact: true }).waitFor();
  await page.getByRole("button", { name: "再解釋一次" }).click();
  await page.getByText("換個方式想", { exact: true }).waitFor();
  await page.getByRole("textbox", { name: "輸入問題" }).fill("我懂了");
  await page.getByRole("button", { name: "送出問題" }).click();
  await page.getByText("我懂了", { exact: true }).waitFor();
});

await run("resource recommendation details", "/resource-chat.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("button", { name: "查看需要什麼資料" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "關閉資料清單" }).click();
  await page.getByRole("button", { name: "查看政府來源" }).click();
  await page.getByRole("button", { name: "關閉政府來源" }).click();
  await page.getByRole("textbox", { name: "輸入訊息" }).fill("我要去哪裡申請？");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await page.getByText("我要去哪裡申請？", { exact: true }).waitFor();
});

await run("resource list search and modal", "/resources.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("textbox", { name: "搜尋資源或問題分類" }).fill("農業");
  await page.getByRole("button", { name: /查看農業天然災害救助詳情/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "稍後再看" }).click();
});

await run("alert tabs, details, and read", "/alerts.html", { width: 390, height: 844 }, async (page) => {
  await page.getByRole("tab", { name: /重要/ }).click();
  await page.getByRole("button", { name: /查看詳情：重要提醒/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "關閉通知詳情" }).click();
  await page.getByRole("button", { name: /將重要提醒標示為已讀/ }).click();
  await page.getByRole("button", { name: /重要提醒已讀/ }).waitFor();
});

await run("teacher period and detail", "/teacher.html", { width: 1440, height: 900 }, async (page) => {
  await page.getByRole("button", { name: /選擇統計期間/ }).click();
  await page.getByRole("menuitem", { name: "過去 30 天" }).click();
  await page.getByText("486", { exact: true }).waitFor();
  await page.getByRole("button", { name: "查看全部" }).click();
  await page.getByRole("dialog").waitFor();
});

await run("government period and insight", "/government.html", { width: 1440, height: 900 }, async (page) => {
  await page.getByRole("button", { name: /選擇統計期間/ }).click();
  await page.getByRole("menuitem", { name: "過去 30 天" }).click();
  await page.getByText("4,968", { exact: true }).waitFor();
  await page.getByRole("button", { name: "查看趨勢" }).click();
  await page.getByRole("dialog").waitFor();
});

await browser.close();
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
