import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { redactAuditError, recordAuditProgress, apiJson, auditBaseUrl, authenticatePage, authenticatedSession } from "./audit-helpers.mjs";

const baseUrl = await auditBaseUrl();
const mobile = { width: 390, height: 844 };
const categories = [
  { key: "disaster", label: "災害", title: "災害救助與安置協助", reply: /公所|社會局|社會處|1957/ },
  { key: "agriculture", label: "農業", title: "農業天然災害救助", reply: /公所|農政/ },
  { key: "education", label: "就學", title: "就學貸款與助學資源", reply: /學校|學務|承貸|助學|就學/ },
  { key: "economy", label: "經濟", title: "弱勢家庭兒少生活扶助", reply: /公所|社會|1957/ },
  { key: "health", label: "健康", title: "心理諮詢與醫療協助", reply: /衛生|心理|醫療|諮商|1925/ },
  { key: "other", label: "其他", title: "社會福利諮詢與轉介", reply: /1957|社會福利|社福|諮詢/ },
];

await mkdir(".screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;

async function run(name, path, viewport, checks) {
  if (process.env.AUDIT_CASE && !name.includes(process.env.AUDIT_CASE)) return;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await authenticatePage(page);
    if (name === "agriculture-flow" || name === "category-switch-resets-session") {
      const identity = (await authenticatedSession()).session;
      await apiJson(`/profile/${encodeURIComponent(identity.user_id)}/memory/family_occupation`, { method: "DELETE" });
    }
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    assert.ok(response?.ok(), `Page returned HTTP ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    await checks(page);
    assert.deepEqual(errors, [], "Browser console and page errors");
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = await redactAuditError(error);
    failures.push({ name, message, errors });
    console.error(`FAIL ${name}: ${message}`);
    await page.screenshot({ path: `.screenshots/category-${name}-failure.png` }).catch(() => {});
  } finally {
    await recordAuditProgress("categories", { passed, failed: failures.length, failures });
    await page.close();
  }
}

async function checkCategory(page, category) {
  const title = page.getByRole("heading", { level: 1 });
  await title.waitFor();
  assert.equal((await title.innerText()).replace(/（Demo 資源方向）$/, ""), category.title, "The category-specific title is preserved with its explicit Demo disclosure");
  await page.getByText(/離線示範/).first().waitFor();
  const currentCategory = page.getByRole("link", { name: `切換到${category.label}分類`, exact: true });
  assert.equal(await currentCategory.getAttribute("aria-current"), "page", "Current category is selected in the navigation");
  if (category.key !== "agriculture") {
    assert.doesNotMatch(await page.getByRole("main").innerText(), /農地|農業部|菜園/, "Category retained agricultural demo copy");
  }
}

async function checkLayout(page) {
  const dimensions = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mainOverflow: document.querySelector("main").scrollWidth - document.querySelector("main").clientWidth,
  }));
  assert.ok(dimensions.pageOverflow <= 1, `Page overflows horizontally by ${dimensions.pageOverflow}px`);
  assert.ok(dimensions.mainOverflow <= 1, `Conversation overflows horizontally by ${dimensions.mainOverflow}px`);
  const viewport = page.viewportSize();
  for (const control of [
    page.getByRole("textbox", { name: "輸入訊息" }),
    page.getByRole("button", { name: "送出訊息" }),
  ]) {
    assert.ok(await control.isVisible(), "Composer control is visible");
    const box = await control.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, "Composer control has usable dimensions");
    assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1, "Composer fits viewport width");
    assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, "Composer fits viewport height");
  }
}

async function checkDetails(page, category) {
  const conversation = await apiJson(`/conversations/${encodeURIComponent(new URL(page.url()).searchParams.get("conversation"))}`);
  const program = conversation.messages.find((message) => message.resource_recommendation).resource_recommendation;
  const documentCount = program.documents.length;
  assert.ok(documentCount >= 2, "The API supplies concrete preparation documents");
  await page.getByRole("button", { name: "查看需要什麼資料" }).click();
  const checklist = page.getByRole("dialog");
  await checklist.waitFor();
  assert.equal(await checklist.getByRole("checkbox").count(), documentCount, "Every API preparation document is rendered");
  for (const document of program.documents) assert.ok((await checklist.innerText()).includes(document));
  if (category.key !== "agriculture") {
    assert.doesNotMatch(await checklist.innerText(), /農地|農業部|菜園|作物/);
  }
  assert.ok(await checklist.getByRole("button", { name: `還有 ${documentCount} 項`, exact: true }).isDisabled());
  await page.getByRole("button", { name: "關閉資料清單" }).click();
  await checklist.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "查看政府來源" }).click();
  const source = page.getByRole("dialog");
  await source.waitFor();
  assert.match(await source.innerText(), /政策主管機關|政府來源/);
  assert.match(await source.innerText(), /建議查詢文字/);
  if (category.key !== "agriculture") {
    assert.doesNotMatch(await source.innerText(), /農地|農業部|菜園|作物/);
  } else {
    assert.match(await source.innerText(), /農業部/);
  }
  await page.getByRole("button", { name: "關閉政府來源" }).click();
  await source.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: "查看需要什麼資料" }).click();
  await checklist.waitFor();
  for (let index = 0; index < documentCount; index += 1) {
    const checkbox = checklist.getByRole("checkbox").nth(index);
    // Chakra visually hides native inputs; click their visible labels as a user would.
    await checkbox.locator("..").click();
    assert.ok(await checkbox.isChecked(), `Preparation item ${index + 1} can be checked`);
  }
  const finish = checklist.getByRole("button", { name: "都準備好了", exact: true });
  assert.ok(await finish.isEnabled());
  await finish.click();
  await checklist.waitFor({ state: "hidden" });
  await page.getByText("資料清單已確認", { exact: true }).waitFor();
  await page.getByRole("button", { name: "查看需要什麼資料" }).click();
  await checklist.waitFor();
  assert.ok(await checklist.getByRole("button", { name: "都準備好了", exact: true }).isEnabled(), "Reopening the same resource preserves checked documents");
  for (let index = 0; index < documentCount; index += 1) assert.ok(await checklist.getByRole("checkbox").nth(index).isChecked());
  await page.getByRole("button", { name: "關閉資料清單" }).click();
  await checklist.waitFor({ state: "hidden" });
}

async function checkReply(page, category) {
  const log = page.getByRole("log", { name: "後續問答" });
  const previousCount = await log.locator("p").count();
  const question = "我要去哪裡申請？";
  const input = page.getByRole("textbox", { name: "輸入訊息" });
  await input.fill(question);
  await page.getByRole("button", { name: "送出訊息" }).click();
  await page.waitForFunction(() => {
    const textarea = document.querySelector('textarea[aria-label="輸入訊息"]');
    return textarea && !textarea.disabled && textarea.value === "";
  });
  const newParagraphs = (await log.locator("p").allTextContents()).slice(previousCount);
  assert.ok(newParagraphs.includes(question), "Submitted question is displayed in the conversation");
  const reply = newParagraphs.filter((text) => text !== question && text.trim().length > 12).join("\n");
  assert.ok(reply.length > 20, "Assistant responds to the follow-up question");
  assert.match(reply, category.reply, "Reply names an appropriate category-specific contact or resource");
  assert.doesNotMatch(reply, /收到！我會把你補充的內容一起列入比對/, "Reply must answer the question instead of using the former generic response");
  if (category.key !== "agriculture") assert.doesNotMatch(reply, /農地|農業部|菜園|作物/);
  await checkLayout(page);
}

async function checkQuickFollowUp(page, category) {
  const prompts = page.getByRole("region", { name: "建議追問" }).getByRole("button");
  assert.equal(await prompts.count(), 3, "Each resource category offers all three authored follow-ups");
  const questions = (await prompts.allTextContents()).map((text) => text.trim());
  const log = page.getByRole("log", { name: "後續問答" });
  const replies = [];
  for (const question of questions) {
    assert.ok(question.length > 3, "Quick follow-up has meaningful question text");
    const previousCount = await log.locator("p").count();
    const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/agent/chat");
    await page.getByRole("region", { name: "建議追問" }).getByRole("button", { name: question, exact: true }).click();
    assert.equal((await responsePromise).status(), 200, "Every suggested resource question succeeds through the API");
    await page.waitForFunction(() => !document.querySelector('textarea[aria-label="輸入訊息"]').disabled);
    const newParagraphs = (await log.locator("p").allTextContents()).slice(previousCount);
    assert.ok(newParagraphs.includes(question), "Quick follow-up appears as a submitted question");
    const reply = newParagraphs.filter((text) => text !== question && text.trim().length > 12).join("\n");
    assert.ok(reply.length > 20, "Quick follow-up receives an answer");
    assert.doesNotMatch(reply, /收到！我會把你補充的內容一起列入比對/);
    if (category.key !== "agriculture") assert.doesNotMatch(reply, /農地|農業部|菜園|作物/);
    replies.push(reply);
  }
  assert.equal(new Set(replies).size, 3, "Different resource needs receive distinct authored responses");
}

try {
  for (const category of categories) {
    await run(`${category.key}-flow`, "/resources.html", mobile, async (page) => {
      const quickCategories = page.getByRole("region", { name: "快速分類提問" });
      assert.equal(await quickCategories.getByRole("link").count(), 6);
      await quickCategories.getByRole("link", { name: new RegExp(`^${category.label}：`) }).click();
      await page.waitForURL((url) => url.pathname === "/resource-chat.html" && url.searchParams.has("conversation"));
      await checkCategory(page, category);
      await checkLayout(page);
      await page.screenshot({ path: `.screenshots/category-${category.key}-390.png` });
      await checkDetails(page, category);

      if (category.key === "agriculture") {
        await page.getByRole("button", { name: "幫我記住", exact: true }).click();
        await page.getByText(/^已記住「/).waitFor();
        assert.match(await page.getByRole("main").innerText(), /已儲存在你的資料中/);
        const identity = (await authenticatedSession()).session;
        const profile = await apiJson(`/profile/${encodeURIComponent(identity.user_id)}`);
        assert.ok(profile.memories.some((item) => item.key === "family_occupation" && item.value === "farmer"), "Explicit consent persists the server-issued memory");
      } else {
        assert.equal(await page.getByRole("button", { name: "幫我記住", exact: true }).count(), 0, "A category alone does not fabricate a personal memory suggestion");
      }
      assert.equal(await page.getByRole("button", { name: "幫我記住", exact: true }).count(), 0);
      await checkQuickFollowUp(page, category);
      await checkReply(page, category);
      await page.goBack();
      await page.waitForURL((url) => url.pathname === "/resources.html");
      await page.getByRole("heading", { name: "快速分類提問", exact: true }).waitFor();
    });
  }

  await run("category-switch-resets-session", "/resource-chat.html?category=agriculture", mobile, async (page) => {
    const agriculture = categories.find((category) => category.key === "agriculture");
    await checkCategory(page, agriculture);
    await page.getByRole("button", { name: "查看需要什麼資料" }).click();
    const checklist = page.getByRole("dialog");
    const firstDocument = checklist.getByRole("checkbox").first();
    await firstDocument.locator("..").click();
    assert.ok(await firstDocument.isChecked());
    await page.getByRole("button", { name: "關閉資料清單" }).click();
    await checklist.waitFor({ state: "hidden" });
    const identity = (await authenticatedSession()).session;
    const profilePath = `/profile/${encodeURIComponent(identity.user_id)}`;
    const beforeDecline = await apiJson(profilePath);
    const memoryWrites = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/memory")) memoryWrites.push(request);
    });
    await page.getByRole("button", { name: "不用", exact: true }).click();
    await page.getByText("好，我不會記住這項資訊", { exact: true }).waitFor();
    assert.equal(memoryWrites.length, 0, "Declining never sends a memory write");
    assert.deepEqual(await apiJson(profilePath), beforeDecline, "Declining preserves persisted profile and memory");
    await checkReply(page, agriculture);
    await page.getByRole("textbox", { name: "輸入訊息" }).fill("這是一段尚未送出的草稿");

    // Switch away and back through the in-page links, keeping the same route.
    for (const key of ["education", "agriculture"]) {
      const category = categories.find((item) => item.key === key);
      const previousConversation = new URL(page.url()).searchParams.get("conversation");
      await page.getByRole("link", { name: `切換到${category.label}分類`, exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/resource-chat.html" && url.searchParams.has("conversation") && url.searchParams.get("conversation") !== previousConversation);
      await checkCategory(page, category);
      assert.equal(await page.getByRole("textbox", { name: "輸入訊息" }).inputValue(), "", "Category switch clears the draft");
      assert.ok(!(await page.getByRole("log", { name: "後續問答" }).innerText()).includes("我要去哪裡申請？"), "Category switch clears prior follow-ups");
      const newConversation = await apiJson(`/conversations/${encodeURIComponent(new URL(page.url()).searchParams.get("conversation"))}`);
      assert.equal(newConversation.messages.length, 2, "New category stores only its own initial question and answer");
      if (key === "agriculture") {
        await page.getByRole("button", { name: "幫我記住", exact: true }).waitFor();
        await page.getByRole("button", { name: "不用", exact: true }).waitFor();
      } else {
        assert.equal(await page.getByRole("button", { name: "幫我記住", exact: true }).count(), 0);
      }
      await page.getByRole("button", { name: "查看需要什麼資料" }).click();
      await checklist.waitFor();
      const documents = checklist.getByRole("checkbox");
      const expectedDocuments = newConversation.messages.find((message) => message.resource_recommendation).resource_recommendation.documents;
      assert.equal(await documents.count(), expectedDocuments.length);
      for (const document of await documents.all()) {
        assert.equal(await document.isChecked(), false, "Category switch clears document preparation state");
      }
      assert.ok(await checklist.getByRole("button", { name: `還有 ${expectedDocuments.length} 項`, exact: true }).isDisabled());
      if (key !== "agriculture") assert.doesNotMatch(await checklist.innerText(), /農地|農業部|菜園|作物/);
      await page.getByRole("button", { name: "關閉資料清單" }).click();
      await checklist.waitFor({ state: "hidden" });
      await checkLayout(page);
    }
    await page.getByRole("button", { name: "幫我記住", exact: true }).click();
    await page.getByText(/^已記住「/).waitFor();
    assert.equal((await apiJson(profilePath)).family_occupation, "farmer", "Consent in a new conversation persists after an earlier decline");
  });

  for (const viewport of [{ width: 320, height: 740 }, { width: 1440, height: 900 }]) {
    for (const category of categories) {
      await run(`${category.key}-${viewport.width}`, `/resource-chat.html?category=${category.key}`, viewport, async (page) => {
        await checkCategory(page, category);
        await checkLayout(page);
        await page.screenshot({ path: `.screenshots/category-${category.key}-${viewport.width}.png` });
      });
    }
  }

  const routeCases = [
    { name: "default-agriculture", query: "", category: "agriculture" },
    { name: "unknown-fallback", query: "?category=unknown", category: "other" },
    { name: "constructor-fallback", query: "?category=constructor", category: "other" },
    { name: "proto-fallback", query: "?category=__proto__", category: "other" },
    { name: "education-query", query: `?q=${encodeURIComponent("就學學費")}`, category: "education" },
    { name: "tuition-pressure-query", query: `?q=${encodeURIComponent("學費壓力")}`, category: "education" },
    { name: "unemployment-pressure-query", query: `?q=${encodeURIComponent("失業生活費壓力")}`, category: "economy" },
    { name: "agriculture-query", query: `?q=${encodeURIComponent("家裡菜園颱風受損，有補助嗎？")}`, category: "agriculture" },
  ];
  for (const test of routeCases) {
    await run(test.name, `/resource-chat.html${test.query}`, mobile, async (page) => {
      await checkCategory(page, categories.find((category) => category.key === test.category));
      await checkLayout(page);
      await page.getByRole("link", { name: "返回", exact: true }).click();
      await page.waitForURL((url) => url.pathname === "/resources.html");
      await page.getByRole("heading", { name: "快速分類提問", exact: true }).waitFor();
    });
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed, failed: failures.length, screenshots: ".screenshots/category-*.png" }));
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
