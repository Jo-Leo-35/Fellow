import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const mobile = { width: 390, height: 844 };
const topics = [
  { key: "newton", title: /牛頓/ },
  { key: "thermodynamics", title: /熱力學/ },
  { key: "entropy", title: /熵/ },
  { key: "equilibrium", title: /化學.*平衡/ },
  { key: "bonding", title: /化學鍵|鍵結/ },
  { key: "reaction-rate", title: /反應速率/ },
];
const imageFixture = {
  name: "physics-question.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6XQAAAAASUVORK5CYII=", "base64"),
};

await mkdir(".screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;

async function run(name, path, viewport, checks) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  page.setDefaultTimeout(8_000);
  page.setDefaultNavigationTimeout(10_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    assert.ok(response?.ok(), `Page returned HTTP ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    await checks(page);
    assert.deepEqual(errors, [], "Browser console and page errors");
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error instanceof Error ? error.message : String(error), errors });
    console.error(`FAIL ${name}`);
    await page.screenshot({ path: `.screenshots/learning-${name}-failure.png` }).catch(() => {});
  } finally {
    await page.close();
  }
}

async function checkTopic(page, topic) {
  await page.getByRole("heading", { level: 1, name: topic.title }).waitFor();
  await page.getByRole("heading", { name: "教學動畫", exact: true }).waitFor();
  const navigation = page.getByRole("navigation", { name: "物理化學主題" });
  assert.equal(await navigation.getByRole("link").count(), 6, "All six topics can be explored");
  assert.equal(await navigation.locator(`[href="/learning-chat.html?topic=${topic.key}"]`).getAttribute("aria-current"), "page");
  await checkProductCopy(page);
  assert.doesNotMatch(await page.getByRole("main").innerText(), /3\/4|1\/2|分數除法/, "Science examples replace the original fractions demo");
}

async function checkProductCopy(page) {
  assert.doesNotMatch(await page.locator("body").innerText(), /示範|模擬|RAG|本機|預寫|生成式\s*AI/i, "Student-facing copy focuses on learning instead of implementation details");
}

async function checkLayout(page) {
  const dimensions = await page.evaluate(() => {
    const main = document.querySelector("main");
    return {
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      mainOverflow: main.scrollWidth - main.clientWidth,
    };
  });
  assert.ok(dimensions.pageOverflow <= 1, `Page overflows horizontally by ${dimensions.pageOverflow}px`);
  assert.ok(dimensions.mainOverflow <= 1, `Conversation overflows horizontally by ${dimensions.mainOverflow}px`);
  const viewport = page.viewportSize();
  for (const control of [
    page.getByRole("textbox", { name: "輸入問題", exact: true }),
    page.getByRole("button", { name: "上傳題目圖片", exact: true }),
    page.getByRole("button", { name: "送出問題", exact: true }),
  ]) {
    assert.ok(await control.isVisible(), "Composer control is visible");
    const box = await control.boundingBox();
    assert.ok(box && box.width > 0 && box.height > 0, "Composer control has usable dimensions");
    assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1, "Composer fits viewport width");
    assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, "Composer fits viewport height");
  }
}

async function checkSources(page) {
  const citation = page.getByRole("button", { name: /^閱讀引用/ }).first();
  const chapter = (await citation.getAttribute("aria-label")).split("：").slice(1).join("：");
  await citation.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /學伴自編教材/);
  await checkProductCopy(page);
  assert.ok((await dialog.innerText()).includes(chapter), "Citation opens its named chapter");
  assert.equal(await dialog.locator("blockquote").count(), 1, "Citation opens one exact source passage");
  assert.ok((await dialog.locator("blockquote").innerText()).length > 50, "Source shows substantive textbook content");
  assert.match(await dialog.innerText(), /p\.?|頁/i, "Source identifies a page");
  await dialog.getByRole("button", { name: "關閉教材" }).click();
  await dialog.waitFor({ state: "hidden" });

  await page.getByRole("button", { name: /^教材庫/ }).click();
  await dialog.waitFor();
  assert.ok(await dialog.locator("blockquote").count() >= 12, "Library includes material across six subjects");
  await checkProductCopy(page);
  const search = dialog.getByRole("textbox", { name: "搜尋教材" });
  await search.fill("火星外星生命研究");
  await dialog.getByText(/沒有找到相關教材/).waitFor();
  assert.equal(await dialog.locator("blockquote").count(), 0, "Unmatched search does not supply unrelated references");
  await search.fill("慣性");
  await dialog.locator("blockquote").first().waitFor();
  assert.match(await dialog.locator("blockquote").allTextContents().then((text) => text.join("\n")), /慣性|合力|等速度/);
  await dialog.getByRole("button", { name: "關閉教材" }).click();
  await dialog.waitFor({ state: "hidden" });
}

async function checkPracticeAndAlternate(page) {
  await page.getByRole("button", { name: "再解釋一次", exact: true }).click();
  await page.getByText("換個方式想", { exact: true }).waitFor();
  const alternate = page.getByText("換個方式想", { exact: true }).locator("..");
  assert.ok((await alternate.innerText()).length > 40, "Alternate explanation gives a substantive analogy");
  await page.getByRole("button", { name: "我想試試", exact: true }).click();
  const practice = page.getByRole("region", { name: "理解練習" });
  await practice.waitFor();
  const options = practice.getByRole("button", { name: /^[A-Z]\. / });
  assert.ok(await options.count() >= 3, "Practice provides multiple choices");
  await practice.getByRole("button", { name: "看答案", exact: true }).click();
  const status = practice.getByRole("status");
  const answerMatch = (await status.innerText()).match(/答案：([A-Z])/);
  assert.ok(answerMatch, "The answer is explained");
  const correctIndex = answerMatch[1].charCodeAt(0) - 65;
  await options.nth((correctIndex + 1) % await options.count()).click();
  assert.match(await status.innerText(), /再想想/);
  await options.nth(correctIndex).click();
  assert.match(await status.innerText(), /答對了/);
  assert.ok((await status.innerText()).length > 40, "Feedback explains the reasoning");
  await page.getByRole("button", { name: "我想試試", exact: true }).click();
  assert.equal(await practice.getByRole("status").count(), 0, "Restarting practice resets answer feedback");
  assert.equal(await practice.locator('[aria-pressed="true"]').count(), 0, "Restarting practice clears the selection");
}

async function checkSimulation(page, topic) {
  const player = page.getByRole("region", { name: "教學動畫播放器" });
  await player.getByRole("button", { name: "播放動畫", exact: true }).click();
  await player.getByText(/^第 2 \/ \d+ 步$/).waitFor();
  await player.getByRole("button", { name: "暫停動畫", exact: true }).click();
  await player.getByRole("button", { name: "播放動畫", exact: true }).waitFor();
  await player.getByRole("button", { name: "重播動畫", exact: true }).click();
  await player.getByText(/^第 1 \/ \d+ 步$/).waitFor();
  await player.getByRole("button", { name: "暫停動畫", exact: true }).click();

  if (topic.key === "newton") {
    const force = page.getByRole("slider", { name: /^合力 F/ });
    const mass = page.getByRole("slider", { name: /^質量 m/ });
    await force.press("Home");
    await page.getByText("a = F ÷ m = 0.0 m/s²", { exact: true }).waitFor();
    await page.getByText(/合力為零.*可能保持等速度/).waitFor();
    await force.press("End");
    await mass.press("End");
    await page.getByText("a = F ÷ m = 2.0 m/s²", { exact: true }).waitFor();
    await mass.press("Home");
    await page.getByText("a = F ÷ m = 20.0 m/s²", { exact: true }).waitFor();
    assert.match(await page.getByRole("img", { name: /公斤的小車/ }).getAttribute("aria-label"), /20\.0/);
    return;
  }
  if (topic.key === "thermodynamics") {
    await page.getByRole("slider", { name: /^系統吸收熱量 Q/ }).press("Home");
    await page.getByRole("slider", { name: /^系統對外做功 W/ }).press("End");
    await page.getByText("ΔU = Q − W = -100 J", { exact: true }).waitFor();
    await page.getByText("內能減少", { exact: true }).waitFor();
    return;
  }
  const toggles = {
    entropy: { initial: "原本：隔板還在", active: "觀察：移除隔板", description: /移除隔板後.*分散/ },
    equilibrium: { initial: "原本的動態平衡", active: "加入反應物 N₂O₄", description: /加入四氧化二氮.*更多二氧化氮/ },
    bonding: { initial: "分子內：共價鍵", active: "分子間：氫鍵", description: /形成氫鍵.*虛線/ },
    "reaction-rate": { initial: "沒有催化劑", active: "加入催化劑", description: /活化能較低.*能量差保持相同/ },
  };
  const toggle = toggles[topic.key];
  const initial = page.getByRole("button", { name: toggle.initial, exact: true });
  const active = page.getByRole("button", { name: toggle.active, exact: true });
  assert.equal(await initial.getAttribute("aria-pressed"), "true");
  await active.click();
  assert.equal(await active.getAttribute("aria-pressed"), "true");
  assert.equal(await initial.getAttribute("aria-pressed"), "false");
  await page.getByRole("img", { name: toggle.description }).waitFor();
  await initial.click();
  assert.equal(await initial.getAttribute("aria-pressed"), "true", "Simulation can return to the original state");
}

async function checkFollowUps(page) {
  const prompts = page.getByRole("region", { name: "建議追問" }).getByRole("button");
  assert.equal(await prompts.count(), 3, "Each topic offers three questions");
  const questions = await prompts.allTextContents();
  const log = page.getByRole("log", { name: "後續問答" });
  const replies = [];
  for (const question of questions) {
    const previous = await log.getByRole("article", { name: "學伴回覆" }).count();
    await page.getByRole("region", { name: "建議追問" }).getByRole("button", { name: question, exact: true }).click();
    const answer = log.getByRole("article", { name: "學伴回覆" }).nth(previous);
    await answer.waitFor();
    assert.ok((await log.innerText()).includes(question), "Suggested question appears in the conversation");
    const text = await answer.innerText();
    assert.ok(text.length > 80, "Follow-up receives a substantive explanation");
    assert.ok(await answer.getByRole("button", { name: /^閱讀引用/ }).count() > 0, "Follow-up cites source passages");
    assert.equal(await answer.getByRole("button", { name: /^查看 \d+ 段教材依據/ }).count(), 1);
    replies.push(text);
  }
  assert.equal(new Set(replies).size, 3, "Different questions receive distinct answers");
  await checkProductCopy(page);
  await checkLayout(page);
}

try {
  for (const topic of topics) {
    await run(`${topic.key}-flow`, `/learning-chat.html?topic=${topic.key}`, mobile, async (page) => {
      await checkTopic(page, topic);
      await checkLayout(page);
      await page.getByRole("heading", { level: 1, name: topic.title }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `.screenshots/learning-${topic.key}-390.png` });
      await checkSources(page);
      await checkSimulation(page, topic);
      await checkPracticeAndAlternate(page);
      await checkFollowUps(page);
    });
  }

  await run("topic-switch-resets-session", "/learning-chat.html?topic=newton", mobile, async (page) => {
    await checkTopic(page, topics[0]);
    const force = page.getByRole("slider", { name: /^合力 F/ });
    const initialForce = await force.inputValue();
    await force.press("End");
    await checkFollowUps(page);
    await page.getByRole("button", { name: "我想試試", exact: true }).click();
    await page.getByRole("region", { name: "理解練習" }).getByRole("button", { name: /^A\. / }).click();
    await page.getByRole("textbox", { name: "輸入問題", exact: true }).fill("尚未送出的草稿");
    await page.locator('input[type="file"]').setInputFiles(imageFixture);
    await page.getByRole("button", { name: "移除已選圖片", exact: true }).waitFor();
    for (const key of ["thermodynamics", "newton"]) {
      await page.getByRole("navigation", { name: "物理化學主題" }).locator(`[href="/learning-chat.html?topic=${key}"]`).click();
      await page.waitForURL((url) => url.searchParams.get("topic") === key);
      await checkTopic(page, topics.find((topic) => topic.key === key));
      assert.equal(await page.getByRole("textbox", { name: "輸入問題", exact: true }).inputValue(), "", "Switch clears the draft");
      assert.equal((await page.getByRole("log", { name: "後續問答" }).innerText()).trim(), "", "Switch clears prior messages");
      assert.equal(await page.getByRole("button", { name: "移除已選圖片", exact: true }).count(), 0, "Switch clears the attachment");
      assert.equal(await page.getByRole("region", { name: "理解練習" }).count(), 0, "Switch closes the practice");
      await checkLayout(page);
    }
    assert.equal(await force.inputValue(), initialForce, "Returning to Newton resets its simulation");
    await page.getByRole("button", { name: "我想試試", exact: true }).click();
    assert.equal(await page.getByRole("region", { name: "理解練習" }).getByRole("status").count(), 0);
  });

  const routes = [
    { name: "default", query: "", topic: "newton" },
    { name: "invalid-topic", query: "?topic=__proto__", topic: "newton" },
    { name: "newton-query", query: `?q=${encodeURIComponent("牛頓力學的解釋")}`, topic: "newton" },
    { name: "thermodynamics-query", query: `?q=${encodeURIComponent("熱力學的解釋")}`, topic: "thermodynamics" },
    { name: "chemistry-history", query: `?history=${encodeURIComponent("化學平衡為什麼還在反應？")}`, topic: "equilibrium", specificQuestion: true },
  ];
  for (const route of routes) {
    await run(route.name, `/learning-chat.html${route.query}`, mobile, async (page) => {
      if (route.specificQuestion) {
        const selected = page.getByRole("navigation", { name: "物理化學主題" }).locator(`[href="/learning-chat.html?topic=${route.topic}"]`);
        assert.equal(await selected.getAttribute("aria-current"), "page", "History selects the relevant topic");
        const answer = page.getByRole("article").first();
        await answer.waitFor();
        assert.match(await answer.innerText(), /平衡.*反應|反應.*平衡/s);
        assert.ok(await answer.getByRole("button", { name: /^閱讀引用/ }).count() > 0, "Specific history question gets a grounded answer");
      } else {
        await checkTopic(page, topics.find((topic) => topic.key === route.topic));
      }
      await checkLayout(page);
    });
  }

  await run("unsupported-query", `/learning-chat.html?q=${encodeURIComponent("火星上的生命從哪裡來？")}`, mobile, async (page) => {
    const reply = page.getByRole("article", { name: "學伴回覆" });
    await reply.waitFor();
    assert.match(await reply.innerText(), /沒有.*教材|找不到.*教材|尚未.*涵蓋|超出.*教材|未找到/s);
    assert.equal(await reply.getByRole("button", { name: /閱讀引用|段教材依據/ }).count(), 0, "Unsupported question has no fabricated citations");
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 0, "An unsupported query does not render an unrelated topic answer");
    await checkProductCopy(page);
    await checkLayout(page);
  });

  await run("free-input-and-image", "/learning-chat.html?topic=newton", mobile, async (page) => {
    await checkTopic(page, topics[0]);
    const input = page.getByRole("textbox", { name: "輸入問題", exact: true });
    const send = page.getByRole("button", { name: "送出問題", exact: true });
    const log = page.getByRole("log", { name: "後續問答" });
    await send.click();
    await page.getByText("請先輸入問題，或選擇題目圖片。", { exact: true }).waitFor();
    await input.fill("火星上的生命從哪裡來？");
    await input.press("Enter");
    const unsupported = log.getByRole("article", { name: "學伴回覆" }).first();
    await unsupported.waitFor();
    assert.match(await unsupported.innerText(), /沒有.*教材|找不到.*教材|尚未.*涵蓋|超出.*教材|未找到/s);
    assert.equal(await unsupported.getByRole("button").count(), 0);
    await checkProductCopy(page);
    assert.equal(await input.inputValue(), "");
    await input.fill("熱力學的解釋");
    await send.click();
    const supported = log.getByRole("article", { name: "學伴回覆" }).nth(1);
    await supported.waitFor();
    assert.match(await supported.innerText(), /熱力學|內能/);
    assert.ok(await supported.getByRole("button", { name: /^閱讀引用/ }).count() > 0);

    await page.locator('input[type="file"]').setInputFiles(imageFixture);
    await page.getByRole("button", { name: "移除已選圖片", exact: true }).waitFor();
    await checkLayout(page);
    await send.click();
    const imageReply = log.getByRole("article", { name: "學伴回覆" }).nth(2);
    await imageReply.waitFor();
    assert.match(await imageReply.innerText(), /請把圖片中的問題打出來/);
    assert.match(await imageReply.innerText(), /目前無法讀取圖片中的文字/);
    assert.equal(await imageReply.getByRole("button").count(), 0, "Image-only question does not invent a source or OCR result");
    assert.equal(await page.getByRole("button", { name: "移除已選圖片", exact: true }).count(), 0);
    await checkProductCopy(page);
    await checkLayout(page);
  });

  for (const viewport of [{ width: 320, height: 740 }, { width: 1440, height: 900 }]) {
    for (const topic of topics) {
      await run(`${topic.key}-${viewport.width}`, `/learning-chat.html?topic=${topic.key}`, viewport, async (page) => {
        await checkTopic(page, topic);
        await checkLayout(page);
        await page.getByRole("heading", { level: 1, name: topic.title }).scrollIntoViewIfNeeded();
        await checkLayout(page);
        await page.screenshot({ path: `.screenshots/learning-${topic.key}-${viewport.width}.png` });
      });
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed, failed: failures.length, screenshots: ".screenshots/learning-*.png" }));
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
