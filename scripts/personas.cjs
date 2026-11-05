const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const XLSX = require("xlsx");
const { login, changePersona } = require("./helpers.cjs");
const base = process.env.BASE_URL || "http://localhost:5173";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
    await page.goto(base + "/collections");
    await page.waitForURL("**/login");
    assert.equal(
      await page
        .getByRole("button", { name: "Login to workspace" })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button")
      .filter({
        has: page.getByRole("heading", { name: "Team Lead", exact: true }),
      })
      .click();
    assert.equal(
      await page.getByLabel("Demo user").locator("option").count(),
      3,
    );
    await page.getByLabel("Demo user").selectOption("tl1");
    await page.getByRole("button", { name: "Login to workspace" }).click();
    await page.waitForURL("**/collections");
    await page.goto(base + "/workspace");
    await page
      .getByRole("heading", { name: "Team workspace", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Team workspace", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByLabel("Management RM")
        .locator('option[value="rm4"]')
        .count(),
      0,
    );
    console.log("PASS persona login, refresh and authorized deep-link return");
    await page.goto(base + "/customers/u302");
    await page.getByRole("heading", { name: "Access unavailable" }).waitFor();
    await page.goto(base + "/workspace");
    await page
      .getByRole("button", { name: "+ Create RM task", exact: true })
      .click();
    const task = page.getByRole("dialog");
    assert.equal(
      await task.getByLabel("Task RM").locator('option[value="rm4"]').count(),
      0,
    );
    await task.getByLabel("Task RM").selectOption("rm1");
    await task.getByLabel("Task unit").selectOption("u0");
    await task
      .getByLabel("Title", { exact: true })
      .fill("Persona regression follow-up");
    await task
      .getByLabel("Description", { exact: true })
      .fill("Review the customer handover documents.");
    await task
      .getByRole("button", { name: "Assign task", exact: true })
      .click();
    await task.waitFor({ state: "hidden" });
    await page.goto(base + "/customers/u0");
    await page
      .getByRole("button", { name: "Override tags", exact: true })
      .click();
    const tags = page.getByRole("dialog");
    await tags.getByLabel("Frequent Escalation", { exact: true }).check();
    await tags
      .getByLabel("Tag override reason")
      .fill("Supervisory review regression");
    await tags.getByRole("button", { name: "Save tags", exact: true }).click();
    await tags.waitFor({ state: "hidden" });
    await page
      .getByText("Frequent Escalation", { exact: true })
      .first()
      .waitFor();
    await page
      .getByLabel("Remark", { exact: true })
      .fill("TL supervisory guidance regression");
    await page.getByRole("button", { name: "Add remark", exact: true }).click();
    await page
      .getByText("TL supervisory guidance regression", { exact: true })
      .waitFor();
    console.log("PASS team isolation, task creation and audited tag override");
    await changePersona(page, "rm1", base);
    assert.equal(
      await page.getByRole("link", { name: "Reports", exact: true }).count(),
      0,
    );
    await page.goto(base + "/workspace/tasks");
    await page
      .getByText("Persona regression follow-up", { exact: true })
      .first()
      .waitFor();
    await page.goto(base + "/customers/u0");
    await page
      .getByText("TL supervisory guidance regression", { exact: true })
      .waitFor();
    await page.getByText("Supervisor", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Edit tags", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByText("Supervisory review regression", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    console.log(
      "PASS task delivery, inherited RM views and persistent supervisor history",
    );
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("sobha-demo-v1"));
      saved.version = 0;
      delete saved.state.db.targets;
      delete saved.state.db.tagAudits;
      delete saved.state.db.escalations;
      saved.state.db.documents.push({
        id: "legacy-document",
        unitId: "u0",
        name: "Legacy agreement.pdf",
        bucket: "General",
        type: "RM upload",
        date: new Date().toISOString(),
        url: "data:application/pdf;base64,JVBERg==",
      });
      localStorage.setItem("sobha-demo-v1", JSON.stringify(saved));
    });
    await page.reload();
    await page
      .getByText("TL supervisory guidance regression", { exact: true })
      .waitFor();
    await page.getByText("Legacy agreement.pdf", { exact: false }).waitFor();
    const migrated = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("sobha-demo-v1")),
    );
    assert.equal(migrated.version, 2);
    assert.ok(migrated.state.db.targets.length > 0);
    assert.ok(
      migrated.state.db.tasks.some(
        (task) => task.title === "Persona regression follow-up",
      ),
    );
    console.log(
      "PASS browser migration preserves remarks, tasks and uploaded document content",
    );

    await changePersona(page, "lead1", base);
    await page
      .getByRole("heading", { name: "Enterprise workspace", exact: true })
      .waitFor();
    await page.getByLabel("Management team").selectOption("tl2");
    assert.equal(
      await page
        .getByLabel("Management RM")
        .locator('option[value="rm1"]')
        .count(),
      0,
    );
    await page.getByLabel("Management RM").selectOption("rm4");
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    const dl = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download report with scope", exact: true })
      .click();
    const file = await dl;
    const wb = XLSX.readFile(await file.path());
    const metadata = XLSX.utils.sheet_to_json(
      wb.Sheets["Scope and sources"],
    )[0];
    assert.equal(metadata.RM, "rm4");
    assert.equal(metadata.Team, "tl2");
    console.log("PASS enterprise filters and report scope export");
    await page
      .getByRole("button", { name: "Reset scope", exact: true })
      .click();
    await page.goto(base + "/tickets/TK-1042");
    const oversight = page.getByRole("dialog");
    assert.equal(
      await oversight
        .getByRole("button", { name: "Send reply", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await oversight
        .getByRole("button", { name: /Mark (Open|Closed)/ })
        .count(),
      0,
    );
    assert.equal(await oversight.getByLabel("Set priority").count(), 0);
    assert.equal(
      await page
        .getByRole("button", { name: "Raise ticket", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
    console.log("PASS Leadership read-only ticket oversight");
    await page.goto(base + "/collections");
    await page.getByLabel("Management month").fill("2000-01");
    await page.getByText("Target not configured", { exact: false }).waitFor();
    assert.ok(!(await page.locator("body").innerText()).includes("NaN"));
    await page
      .getByRole("button", { name: "Reset scope", exact: true })
      .click();
    console.log(
      "PASS missing-month targets render without invalid percentages",
    );

    await page.goto(base + "/escalations");
    const csv =
      "Review ID,Unit Number,Customer Code,Subject,Review Status\nREV-PERSONA-001,B-0902,C10000,Review possession documents,In review\n";
    await page.getByLabel("Review sheet", { exact: true }).setInputFiles({
      name: "reviews.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await page
      .getByRole("heading", { name: "Import preview", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Confirm import", exact: true })
      .click();
    await page.getByText("1 reviews imported.", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "+ Manager guidance", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Remark", { exact: true })
      .fill("Leadership escalation guidance");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add remark", exact: true })
      .click();
    await page
      .getByText("Leadership escalation guidance", { exact: true })
      .waitFor();
    await page.reload();
    await page.getByText("REV-PERSONA-001", { exact: true }).waitFor();
    await page
      .getByText("Leadership escalation guidance", { exact: true })
      .waitFor();
    const importedState = await page.evaluate(
      () => JSON.parse(localStorage.getItem("sobha-demo-v1")).state.db,
    );
    assert.equal(importedState.tickets.length, 75);
    assert.ok(
      importedState.remarks.some(
        (remark) =>
          remark.text === "Leadership escalation guidance" &&
          remark.role === "Leadership",
      ),
    );

    await page.getByLabel("Review sheet", { exact: true }).setInputFiles({
      name: "duplicate.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await page.getByText("Duplicate Review ID", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Confirm import", exact: true })
        .isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Cancel import", exact: true })
      .click();
    console.log(
      "PASS review import preview, persistence and duplicate validation",
    );
    await changePersona(page, "tl2", base);
    await page
      .getByRole("heading", { name: "Team workspace", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Management RM").locator("option").count(),
      2,
    );
    await page.goto(base + "/customers/u0");
    await page.getByRole("heading", { name: "Access unavailable" }).waitFor();
    await page.goto(base + "/workspace");
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await page.waitForURL("**/login");
    await page.goto(base + "/reports");
    await page.waitForURL("**/login");
    console.log("PASS North team isolation and logout guards");
    assert.deepEqual(errors, []);
    console.log("PASS no browser errors");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
