import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const cases = [
  { name: "home", path: "/index.html", width: 390, height: 844 },
  { name: "learning", path: "/learning-chat.html", width: 390, height: 844 },
  { name: "resource-chat", path: "/resource-chat.html", width: 390, height: 844 },
  { name: "resources", path: "/resources.html", width: 390, height: 844 },
  { name: "alerts", path: "/alerts.html", width: 390, height: 844 },
  { name: "teacher", path: "/teacher.html", width: 1440, height: 900 },
  { name: "government", path: "/government.html", width: 1440, height: 900 },
];

await mkdir(".screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

for (const item of cases) {
  const page = await browser.newPage({
    viewport: { width: item.width, height: item.height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const response = await page.goto(`${baseUrl}${item.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `.screenshots/${item.name}.png`, fullPage: false });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    textLength: document.body.innerText.trim().length,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hasMain: Boolean(document.querySelector("main")),
  }));

  if (!response?.ok() || errors.length || metrics.horizontalOverflow > 1 || metrics.textLength < 40 || !metrics.hasMain) {
    failures.push({ name: item.name, status: response?.status(), errors, ...metrics });
  }
  console.log(JSON.stringify({ name: item.name, status: response?.status(), errors, ...metrics }));

  if (item.name === "home") {
    await page.getByRole("button", { name: "開啟聊天紀錄" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: ".screenshots/home-drawer.png", fullPage: false });
  }
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
