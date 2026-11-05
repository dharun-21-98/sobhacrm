const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { login, changePersona } = require("./helpers.cjs");
const base = process.env.BASE_URL || "http://localhost:5173";
async function fits(page, label) {
  const metrics = await page.evaluate(() => ({
    viewport: innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  assert.ok(
    metrics.page <= metrics.viewport + 1,
    `${label}: page width ${metrics.page} exceeds viewport ${metrics.viewport}`,
  );
}
async function dialogFits(page) {
  const rect = await page.getByRole("dialog").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  assert.ok(
    rect.left >= 0 &&
      rect.right <= rect.width + 1 &&
      rect.top >= 0 &&
      rect.bottom <= rect.height + 1,
    JSON.stringify(rect),
  );
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.abort(),
    );
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + "/login");
      await page
        .getByRole("heading", { name: "Choose your perspective" })
        .waitFor();
      await fits(page, `login ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "rm1", base);
    const routes = [
      "/workspace",
      "/workspace/tasks",
      "/customers",
      "/customers/u0",
      "/collections",
      "/handover-registration",
      "/handover-registration/u0",
      "/projects",
      "/faqs",
      "/tickets",
      "/tickets/TK-1042",
    ];
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of routes) {
        await page.goto(base + route);
        await page.locator("h1").first().waitFor();
        await fits(page, `RM ${width} ${route}`);
        if (route.includes("TK-")) await dialogFits(page);
      }
      console.log(`PASS RM routes and dialogs at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/workspace");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    const drawer = page.getByRole("dialog", {
      name: "Navigation",
      exact: true,
    });
    await drawer.waitFor();
    await drawer
      .getByRole("link", { name: "Customer 360", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).pathname, "/customers");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "hidden" });
    assert.equal(
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .locator(".navigation-overlay")
      .click({ position: { x: 380, y: 300 } });
    await drawer.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await drawer.waitFor({ state: "hidden" });
    assert.equal(
      await page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).pointerEvents),
      "auto",
    );
    await page
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
    await page.setViewportSize({ width: 768, height: 1024 });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await drawer
      .getByRole("link", { name: "Collections", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
    console.log(
      "PASS drawer links, Escape, backdrop, focus return and desktop/tablet resize",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/customers");
    const table = page.getByRole("region", {
      name: "Customer directory table",
      exact: true,
    });
    await table.waitFor();
    assert.equal(
      await table.evaluate((el) => el.scrollWidth > el.clientWidth),
      true,
    );
    await table.focus();
    await page.keyboard.press("End");
    await table.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    assert.ok(await table.evaluate((el) => el.scrollLeft > 0));
    await fits(page, "scrolled customer directory");
    await page.getByLabel("Search list", { exact: true }).fill("B-0902");
    await table.evaluate((el) => {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    });
    await page.getByText("B-0902 · Sobha Neopolis", { exact: true }).click();
    await page.waitForURL("**/customers/u0");
    await page.getByRole("button", { name: "Remarks", exact: true }).click();
    await page
      .getByLabel("Remark", { exact: true })
      .fill("Mobile layout remark regression");
    await page.getByRole("button", { name: "Add remark", exact: true }).click();
    await page
      .getByText("Mobile layout remark regression", { exact: true })
      .waitFor();
    console.log(
      "PASS horizontally scrollable table, customer drill-down and mobile remark save",
    );
    await page.getByRole("button", { name: "Documents", exact: true }).click();
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await dialogFits(page);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Edit tags", exact: true }).click();
    await dialogFits(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save tags", exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator("header").getByRole("button").last().click();
    await page
      .getByRole("button", { name: "Change persona", exact: true })
      .click();
    await login(page, "tl1", base);
    await page
      .getByRole("button", { name: "+ Create RM task", exact: true })
      .click();
    await dialogFits(page);
    await page.getByLabel("Task RM", { exact: true }).selectOption("rm1");
    await page.getByLabel("Task unit", { exact: true }).selectOption("u0");
    await page
      .getByLabel("Title", { exact: true })
      .fill("Tablet and phone task");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Created from the responsive task dialog.");
    await page
      .getByRole("button", { name: "Assign task", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    console.log(
      "PASS mobile upload, tag and task dialogs with working controls",
    );
    for (const id of ["tl1", "lead1"]) {
      if (id === "lead1") await changePersona(page, id, base);
      for (const width of [390, 768, 1024]) {
        await page.setViewportSize({ width, height: 844 });
        for (const route of [
          "/workspace",
          "/customers",
          "/collections",
          "/handover-registration",
          "/projects",
          "/tickets",
          "/faqs",
          "/reports",
          ...(id === "lead1" ? ["/escalations"] : []),
        ]) {
          await page.goto(base + route);
          await page.locator("h1").first().waitFor();
          await fits(page, `${id} ${width} ${route}`);
        }
        console.log(`PASS ${id} management routes at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto(base + "/workspace");
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await drawer
      .getByRole("link", { name: "Escalation Review", exact: true })
      .click();
    await drawer.waitFor({ state: "hidden" });
    await fits(page, "landscape review register");
    await page.goto(base + "/workspace");
    await page
      .getByRole("button", { name: "+ Create RM task", exact: true })
      .click();
    await dialogFits(page);
    await page
      .getByRole("button", { name: "Assign task", exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    console.log(
      "PASS landscape navigation and scrollable short-height dialogs",
    );
    assert.deepEqual(errors, []);
    console.log("PASS no browser errors");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
