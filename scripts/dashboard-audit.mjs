import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { redactAuditError, recordAuditProgress, apiJson, auditBaseUrl, authenticatePage, authenticatedSession, selectDashboardFilter } from "./audit-helpers.mjs";

const baseUrl = await auditBaseUrl();
const browser = await chromium.launch({ headless: true });
const failures = [];
let passed = 0;
await mkdir(".screenshots", { recursive: true });

async function run(name, role, width, checks) {
  if (process.env.DASHBOARD_ROLE && process.env.DASHBOARD_ROLE !== role) return;
  if (process.env.DASHBOARD_CASE && !name.includes(process.env.DASHBOARD_CASE))
    return;
  const page = await browser.newPage({
    viewport: { width, height: 950 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await authenticatePage(page, role);
    const response = await page.goto(`${baseUrl}/${role}.html`, {
      waitUntil: "networkidle",
    });
    assert.ok(response?.ok());
    await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    await checks(page);
    assert.deepEqual(errors, [], "No browser errors");
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = await redactAuditError(error);
    failures.push({ name, message, errors });
    console.error(`FAIL ${name}: ${message}`);
    await page
      .screenshot({ path: `.screenshots/${name}-failure.png`, fullPage: true })
      .catch(() => {});
  } finally {
    await recordAuditProgress("dashboards", { passed, failed: failures.length, failures });
    await page.close();
  }
}

async function navigate(page, role, label) {
  if (page.viewportSize().width < 992)
    await page.getByRole("button", { name: "開啟選單" }).click();
  await page
    .getByRole("navigation", {
      name: `${role === "teacher" ? "教師" : "政府"}版導覽`,
    })
    .getByRole("button", { name: label, exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

async function layout(page) {
  const metrics = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    mainOverflow:
      document.querySelector("main").scrollWidth -
      document.querySelector("main").clientWidth,
    broken: [...document.querySelectorAll('img[src*="reference-"]')]
      .filter((img) => !img.complete || !img.naturalWidth)
      .map((img) => img.src),
  }));
  assert.ok(metrics.overflow <= 1, `Page overflows by ${metrics.overflow}px`);
  assert.ok(
    metrics.mainOverflow <= 1,
    `Main overflows by ${metrics.mainOverflow}px`,
  );
  assert.deepEqual(metrics.broken, [], "Reference artwork loads");
  const role = new URL(page.url()).pathname.startsWith("/teacher") ? "teacher" : "government";
  const scope = (await authenticatedSession(role)).session.scope_label;
  const productCopy = (await page.getByRole("main").innerText()).replaceAll("離線示範", "").replaceAll("Fake Demo", "");
  assert.doesNotMatch(
    scope ? productCopy.replaceAll(scope, "") : productCopy,
    /示範|模擬|RAG|Demo|預寫|本機/i,
  );
}

const menus = {
  teacher: ["總覽", "學生管理", "學習洞察", "資源協助", "設定"],
  government: ["總覽", "教育需求", "資源使用", "地區分析", "趨勢洞察", "設定"],
};
for (const role of Object.keys(menus)) {
  for (const width of [320, 390, 1024, 1440]) {
    await run(`${role}-navigation-${width}`, role, width, async (page) => {
      for (const label of menus[role]) {
        await navigate(page, role, label);
        await layout(page);
        assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: `.screenshots/${role}-${width}-${menus[role].indexOf(label)}.png`,
            fullPage: true,
          });
      }
      assert.equal(
        await page
          .getByRole("navigation", { name: "切換使用介面" })
          .getByRole("link")
          .count(),
        3,
      );
    });
  }
}

await run(
  "government-filters-csv-and-tracking",
  "government",
  1440,
  async (page) => {
    const kpi = page.getByTestId("government-kpi-資源需求");
    const count = async () =>
      Number((await kpi.innerText()).split("\n")[0].replaceAll(",", ""));
    const week = await count();
    await selectDashboardFilter(page, "government", "統計期間", "30d", "period");
    const month = await count();
    assert.ok(month > week, "A longer period contains more needs");
    const filtered = await selectDashboardFilter(page, "government", "地區篩選", "甲仙", "region");
    const regional = await count();
    assert.ok(
      regional > 0 && regional < month,
      "Region filter narrows the same counts",
    );
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "匯出彙整", exact: true }).click();
    const download = await downloadPromise;
    const csv = await readFile(await download.path(), "utf8");
    const rows = csv
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((row) => row.replace(/^"|"$/g, "").split('","'));
    const groups = new Set(filtered.daily_aggregates.map((row) => `${row.region}:${row.topic}`));
    assert.equal(rows.length, groups.size, "CSV has exactly the observed API region/topic groups");
    assert.ok(rows.every((row) => row[2] === "甲仙區"));
    for (const [index, field] of [[4, "event_count"], [5, "resource_need_count"], [6, "potential_need_count"], [7, "resource_view_count"]]) {
      assert.equal(rows.reduce((sum, row) => sum + Number(row[index]), 0), filtered.totals[field], `CSV reconciles ${field}`);
    }
    assert.equal(
      rows.reduce((sum, row) => sum + Number(row[5]), 0),
      regional,
      "CSV totals match filtered dashboard",
    );
    assert.doesNotMatch(
      csv,
      /student|user_id|nickname|conversation|姓名|學號|對話|家庭/i,
    );
    await page.getByRole("button", { name: "查看趨勢", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "加入追蹤", exact: true }).click();
    await dialog.getByRole("button", { name: "完成", exact: true }).click();
    await navigate(page, "government", "趨勢洞察");
    await page.getByRole("button", { name: /移除甲仙區.*追蹤/ }).waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await navigate(page, "government", "趨勢洞察");
    await page.getByRole("button", { name: /移除甲仙區.*追蹤/ }).click();
    await page
      .getByText("從需求詳情加入追蹤，持續掌握變化。", { exact: true })
      .waitFor();
  },
);

await run("government-preferences", "government", 390, async (page) => {
  await navigate(page, "government", "設定");
  await page.getByLabel("預設統計期間", { exact: true }).selectOption("30d");
  await page.getByLabel("預設地區", { exact: true }).selectOption("六龜");
  await page.getByText("顯示前期比較", { exact: true }).click();
  assert.equal(
    await page.getByLabel("顯示前期比較", { exact: true }).isChecked(),
    false,
  );
  await page.getByRole("button", { name: "儲存並套用" }).click();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.getByLabel("統計期間", { exact: true }).inputValue(),
    "30d",
  );
  assert.equal(
    await page.getByLabel("地區篩選", { exact: true }).inputValue(),
    "六龜",
  );
  assert.doesNotMatch(
    await page.getByTestId("government-kpi-資源需求").innerText(),
    /[+-]\d+\.\d+%/,
  );
});

await run("teacher-filters-students-and-csv", "teacher", 1440, async (page) => {
  const questionCount = async () =>
    Number(
      (await page.getByTestId("teacher-question-count").innerText()).replaceAll(
        ",",
        "",
      ),
    );
  const week = await questionCount();
  await selectDashboardFilter(page, "teacher", "選擇統計期間", "30d", "period");
  const month = await questionCount();
  assert.ok(month > week);
  await selectDashboardFilter(page, "teacher", "選擇班級", "801", "class_id");
  const classCount = await questionCount();
  assert.ok(classCount > 0 && classCount < month);
  await selectDashboardFilter(page, "teacher", "選擇科目", "物理", "subject");
  const physicsCount = await questionCount();
  assert.ok(physicsCount > 0 && physicsCount < classCount);
  await navigate(page, "teacher", "學生管理");
  assert.equal(await page.locator("tbody tr").count(), 14);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出班級摘要", exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.replace(/^"|"$/g, "").split('","'));
  assert.equal(rows.length, 14);
  assert.ok(rows.every((row) => row[0] === "八年一班" && row[4] === "物理"));
  assert.equal(
    rows.reduce((sum, row) => sum + Number(row[5]), 0),
    physicsCount,
  );
  await page.getByRole("textbox", { name: "搜尋學生" }).fill("不存在的姓名");
  await page.getByText("沒有符合條件的學生", { exact: true }).waitFor();
  await page.getByRole("button", { name: "顯示全部學生", exact: true }).click();
  await page.getByRole("textbox", { name: "搜尋學生" }).fill("陳予安");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page
    .getByRole("button", { name: "查看 陳予安 學習詳情", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("陳予安的學習概況", { exact: true }).waitFor();
  const animation = dialog.getByRole("link", { name: "一起看教學動畫" });
  assert.match(
    await animation.getAttribute("href"),
    /^\/learning-chat.html\?topic=(newton|thermodynamics|entropy)$/,
  );
  await dialog
    .getByRole("button", { name: "安排個別複習", exact: true })
    .click();
  await page
    .getByLabel("給自己的教學備註")
    .fill("先畫受力圖，再說明合力與加速度的關係。");
  await page.getByRole("button", { name: "儲存複習計畫", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await navigate(page, "teacher", "資源協助");
  await page
    .getByText("先畫受力圖，再說明合力與加速度的關係。", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: /^完成.+複習$/ }).click();
  await page.getByRole("button", { name: /^重新開啟.+複習$/ }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await navigate(page, "teacher", "資源協助");
  await page.getByRole("button", { name: /^重新開啟.+複習$/ }).click();
  await page.getByRole("button", { name: /^完成.+複習$/ }).waitFor();
});

await run(
  "teacher-animation-library-and-preferences",
  "teacher",
  390,
  async (page) => {
    await navigate(page, "teacher", "資源協助");
    const links = await page
      .getByRole("link", { name: "開啟動畫", exact: true })
      .evaluateAll((items) => items.map((item) => item.getAttribute("href")));
    assert.equal(
      new Set(links).size,
      6,
      "All six science animations are available",
    );
    await page.getByRole("button", { name: "加入牛頓力學複習計畫" }).click();
    await page
      .getByRole("button", { name: "儲存複習計畫", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "加入牛頓力學複習計畫" }).click();
    await page
      .getByRole("button", { name: "儲存複習計畫", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      await page
        .getByRole("button", { name: "完成牛頓力學複習", exact: true })
        .count(),
      1,
      "Duplicate pending plans are prevented",
    );
    await navigate(page, "teacher", "設定");
    await page.getByLabel("顯示名稱", { exact: true }).fill("林老師");
    await page.getByLabel("預設班級", { exact: true }).selectOption("802");
    await page
      .getByLabel("需要關注的練習正確率門檻", { exact: true })
      .selectOption("70");
    await page.getByText("顯示教學提案", { exact: true }).click();
    await page
      .getByRole("button", { name: "儲存教學偏好", exact: true })
      .click();
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(
      await page.getByLabel("選擇班級", { exact: true }).inputValue(),
      "802",
    );
    assert.equal(
      await page.getByText("本期教學提案", { exact: true }).count(),
      0,
    );
    await navigate(page, "teacher", "設定");
    assert.equal(
      await page.getByLabel("顯示名稱", { exact: true }).inputValue(),
      "林老師",
    );
    assert.equal(
      await page
        .getByLabel("需要關注的練習正確率門檻", { exact: true })
        .inputValue(),
      "70",
    );
  },
);

await run(
  "government-aggregate-integrity",
  "government",
  1440,
  async () => {
    const failures = [];
    const fields = new Set();
    let combinations = 0;
    const districts = ["甲仙", "六龜", "杉林", "美濃", "旗山", "內門"];
    const countFields = ["event_count", "resource_need_count", "potential_need_count", "resource_view_count"];
    const forbidden = new Set(["user_id", "student_id", "nickname", "student_name", "conversation_id", "message_id", "attachment_id", "family_occupation", "family_type", "economic_status", "raw_message", "profile"]);
    function inspectKeys(value) {
      if (!value || typeof value !== "object") return;
      for (const [key, nested] of Object.entries(value)) {
        assert.ok(!forbidden.has(key), `Government payload excludes ${key}`);
        inspectKeys(nested);
      }
    }
    for (const period of ["7d", "30d", "quarter"]) {
      for (const region of ["all", ...districts]) {
        const query = new URLSearchParams({ period, region });
        const data = await apiJson(`/dashboard/government?${query}`, { role: "government" });
        combinations += 1;
        inspectKeys(data);
        for (const key of countFields) {
          for (const rows of [data.topics, data.regions, data.trend, data.daily_aggregates]) {
            if (rows.reduce((sum, row) => sum + row[key], 0) !== data.totals[key]) failures.push(`${period}/${region}/${key} totals`);
          }
          for (const rows of [data.topics, data.regions, data.trend]) {
            if (rows.reduce((sum, row) => sum + row.previous[key], 0) !== data.previous_totals[key]) failures.push(`${period}/${region}/${key} prior`);
          }
        }
        const expectedShare = data.totals.resource_need_count > 0 ? 100 : 0;
        if (Math.abs(data.topics.reduce((sum, topic) => sum + topic.percentage, 0) - expectedShare) > 0.001) failures.push(`${period}/${region} percentages`);
        for (const row of data.daily_aggregates) {
          Object.keys(row).forEach((key) => fields.add(key));
          assert.ok(row.potential_need_count <= row.resource_need_count && row.resource_view_count <= row.resource_need_count && row.resource_need_count <= row.event_count, "Aggregate count bounds hold");
          assert.ok(countFields.every((key) => Number.isInteger(row[key]) && row[key] >= 0), "Aggregate counts are nonnegative integers");
          if (region !== "all") assert.equal(row.region, region);
        }
      }
    }
    assert.equal(combinations, 21);
    assert.deepEqual(
      failures,
      [],
      "All 21 period/region combinations reconcile",
    );
    assert.deepEqual(
      [...fields].sort(),
      ["date", "event_count", "potential_need_count", "region", "resource_need_count", "resource_view_count", "topic"],
      "Government records contain only aggregate fields",
    );
  },
);

await browser.close();
console.log(`${passed} dashboard scenarios passed; ${failures.length} failed.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
