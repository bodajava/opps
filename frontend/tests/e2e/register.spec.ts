import { expect, test } from "@playwright/test"
import { execFileSync } from "node:child_process"

const runId = `${process.pid}-${Date.now()}`
const emailPrefix = `pw-register-${runId}`
const password = "StrongPass123"

test.afterAll(() => {
  const script = `
    require('./backend/node_modules/dotenv').config({ path: 'backend/.env.local' });
    const mongoose = require('./backend/node_modules/mongoose');
    (async () => {
      const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
      if (!uri) throw new Error('Missing MongoDB URI');
      await mongoose.connect(uri);
      const users = mongoose.connection.collection('users');
      const otps = mongoose.connection.collection('email_otps');
      const refreshTokens = mongoose.connection.collection('refresh_tokens');
      const matchedUsers = await users.find(
        { email: { $regex: '^' + process.env.TEST_EMAIL_PREFIX } },
        { projection: { _id: 1 } },
      ).toArray();
      const userIds = matchedUsers.map((user) => String(user._id));
      await refreshTokens.deleteMany({ userId: { $in: userIds } });
      await users.deleteMany({ email: { $regex: '^' + process.env.TEST_EMAIL_PREFIX } });
      await otps.deleteMany({ email: { $regex: '^' + process.env.TEST_EMAIL_PREFIX } });
      await mongoose.disconnect();
    })().catch(async (error) => {
      await mongoose.disconnect().catch(() => undefined);
      console.error(error.message);
      process.exit(1);
    });
  `
  execFileSync("node", ["-e", script], {
    cwd: "..",
    env: { ...process.env, TEST_EMAIL_PREFIX: emailPrefix },
    stdio: "pipe",
  })
})

async function fillRegisterForm(page: import("@playwright/test").Page, fields: {
  fullName?: string
  email: string
  phone?: string
  password?: string
}) {
  const nextPassword = fields.password ?? password
  await page.goto("/register")
  await page.getByLabel("Full Name").fill(fields.fullName ?? "Playwright Register User")
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(fields.email)
  if (fields.phone !== undefined) {
    await page.getByLabel("Phone").fill(fields.phone)
  }
  await page.getByLabel("Password", { exact: true }).fill(nextPassword)
  await page.getByLabel("Confirm Password").fill(nextPassword)
}

test("register shows safe useful errors and allows the new account to log in", async ({ page }) => {
  test.setTimeout(90_000)
  const email = `${emailPrefix}-success@example.test`

  await fillRegisterForm(page, { email, phone: "01012345678" })
  const registerResponse = page.waitForResponse((response) =>
    response.url().includes("/api/auth/register") &&
    response.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect((await registerResponse).status()).toBe(201)
  await expect(page).not.toHaveURL(/\/register/)

  await page.evaluate(() => localStorage.clear())
  await page.goto("/login")
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(page).not.toHaveURL(/\/login/)

  await page.evaluate(() => localStorage.clear())
  await fillRegisterForm(page, { email, phone: "01012345678" })
  const duplicateResponse = page.waitForResponse((response) =>
    response.url().includes("/api/auth/register") &&
    response.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect((await duplicateResponse).status()).toBe(409)
  await expect(page.getByText("Email already registered")).toBeVisible()
  await expect(page.getByText("Registration failed")).toHaveCount(0)
})

test("register validates phone and password policy before submitting", async ({ page }) => {
  await fillRegisterForm(page, {
    email: `${emailPrefix}-invalid-phone@example.test`,
    phone: "1234567890",
  })
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page.getByText("Please enter a valid Egyptian phone number starting with 01")).toBeVisible()

  await fillRegisterForm(page, {
    email: `${emailPrefix}-weak-password@example.test`,
    phone: "01012345678",
    password: "weakpass1",
  })
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page.getByText("Password must contain at least one uppercase letter")).toBeVisible()
})

test("register shows a clear verification-email failure", async ({ page }) => {
  await page.route("**/api/auth/register", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        statusCode: 503,
        message: "Verification email could not be sent. Please try again later.",
      }),
    })
  })

  await fillRegisterForm(page, {
    email: `${emailPrefix}-smtp@example.test`,
    phone: "01012345678",
  })
  await page.getByRole("button", { name: "Create Account" }).click()
  await expect(page.getByText("Verification email could not be sent. Please try again later.")).toBeVisible()
  await expect(page.getByText("Registration failed")).toHaveCount(0)
})
