const names = {
  RM: "Relationship Manager",
  TL: "Team Lead",
  Leadership: "Leadership",
};
async function login(page, id = "rm1", base = "http://localhost:5173") {
  const role = id.startsWith("rm")
    ? "RM"
    : id.startsWith("tl")
      ? "TL"
      : "Leadership";
  await page.goto(base + "/login");
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: names[role], exact: true }),
    })
    .click();
  await page.getByLabel("Demo user", { exact: true }).selectOption(id);
  await page
    .getByRole("button", { name: "Login to workspace", exact: true })
    .click();
}
async function changePersona(page, id, base = "http://localhost:5173") {
  await page.locator("header").getByRole("button").last().click();
  await page
    .getByRole("button", { name: "Change persona", exact: true })
    .click();
  await login(page, id, base);
}
module.exports = { login, changePersona };
