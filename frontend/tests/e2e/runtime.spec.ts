import { expect, test, type Page } from "@playwright/test"
import { loadEnvFile } from "node:process"
import { resolve } from "node:path"

loadEnvFile(resolve(__dirname, "../../../backend/.env.local"))

interface RuntimeSignals {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  serverErrors: string[]
  apiErrors: string[]
}

function monitorRuntime(page: Page): RuntimeSignals {
  const signals: RuntimeSignals = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
    apiErrors: [],
  }
  page.on("console", (message) => {
    if (message.type() === "error") signals.consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => signals.pageErrors.push(error.message))
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") {
      signals.failedRequests.push(`${request.method()} ${request.url()}`)
    }
  })
  page.on("response", (response) => {
    if (response.status() >= 500) signals.serverErrors.push(`${response.status()} ${response.url()}`)
    if (response.url().includes("localhost:4001/api/") && response.status() >= 400) {
      signals.apiErrors.push(`${response.status()} ${response.url()}`)
    }
  })
  return signals
}

function expectCleanRuntime(signals: RuntimeSignals): void {
  expect(signals.consoleErrors).toEqual([])
  expect(signals.pageErrors).toEqual([])
  expect(signals.failedRequests).toEqual([])
  expect(signals.serverErrors).toEqual([])
  expect(signals.apiErrors).toEqual([])
}

test("guest storefront routes render without runtime failures", async ({ page }) => {
  const signals = monitorRuntime(page)
  const routes = ["/", "/products", "/categories", "/login", "/register", "/forgot-password", "/cart"]
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" })
    expect(response?.status(), route).toBeLessThan(400)
    await expect(page.locator("body"), route).not.toBeEmpty()
  }
  expectCleanRuntime(signals)
})

test("guest protected route preserves the exact return path", async ({ page }) => {
  await page.goto("/admin/products")
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login")
  await expect.poll(() => new URL(page.url()).searchParams.get("returnTo")).toBe("/admin/products")
})

test("super admin login and all admin routes render real contracts", async ({ page }) => {
  test.setTimeout(120_000)
  const signals = monitorRuntime(page)
  const password = process.env.ADMIN_SEED_PASSWORD
  expect(password, "ADMIN_SEED_PASSWORD must be configured locally").toBeTruthy()
  await page.goto("/login")
  await page.getByLabel("Email").fill("oppsfoods.egy@gmail.com")
  await page.getByLabel("Password").fill(password ?? "")
  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(page).not.toHaveURL(/\/login/)

  const routes = [
    "/admin",
    "/admin/products",
    "/admin/orders",
    "/admin/categories",
    "/admin/coupons",
    "/admin/customers",
    "/admin/inventory",
    "/admin/payments",
    "/admin/delivery-zones",
    "/admin/financial",
    "/admin/analytics",
    "/admin/campaigns",
    "/admin/reports",
    "/admin/settings",
    "/admin/audit-logs",
  ]
  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" })
    expect(response?.status(), route).toBeLessThan(400)
    await expect(page.locator("h1").first(), route).toBeVisible()
    await expect(page.getByText(/Cannot (GET|POST|PATCH|PUT|DELETE)/)).toHaveCount(0)
  }
  expectCleanRuntime(signals)
})

test("super admin completes product and category CRUD through the UI", async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const signals = monitorRuntime(page)
  const password = process.env.ADMIN_SEED_PASSWORD
  expect(password, "ADMIN_SEED_PASSWORD must be configured locally").toBeTruthy()
  const suffix = `${Date.now()}-${testInfo.workerIndex}`
  const categoryName = `Playwright Category ${suffix}`
  const categoryUpdated = `${categoryName} Updated`
  const productName = `Playwright Product ${suffix}`
  const productUpdated = `${productName} Updated`
  const sku = `PW-${suffix}`
  let productId = ""
  let categoryId = ""

  await page.goto("/login")
  await page.getByLabel("Email").fill("oppsfoods.egy@gmail.com")
  await page.getByLabel("Password").fill(password ?? "")
  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(page).not.toHaveURL(/\/login/)

  const accessToken = await page.evaluate(() => {
    const stored = localStorage.getItem("opps-auth")
    return stored ? JSON.parse(stored).state.accessToken : ""
  })
  expect(accessToken).toBeTruthy()

  try {
    await page.goto("/admin/categories")
    await page.getByRole("button", { name: "Add Category" }).click()
    await page.getByLabel("Name").fill(categoryName)
    await page.getByLabel("Description").fill("Temporary Playwright category")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Category created")).toBeVisible()

    const categoryResponse = await page.request.get(`http://localhost:4001/api/admin/categories?search=${encodeURIComponent(categoryName)}`, { headers: { authorization: `Bearer ${accessToken}` } })
    expect(categoryResponse.ok()).toBeTruthy()
    const categoryBody = await categoryResponse.json()
    categoryId = categoryBody.data.items[0].id
    await expect(page.getByRole("button", { name: `Edit ${categoryName}` })).toBeVisible()

    await page.getByRole("button", { name: `Edit ${categoryName}` }).click()
    await page.getByLabel("Name").fill(categoryUpdated)
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Category updated")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${categoryUpdated}` })).toBeVisible()

    await page.goto("/admin/products")
    await page.getByRole("button", { name: "Add Product" }).click()
    await page.getByLabel("Name").fill(productName)
    await page.getByLabel("SKU").fill(sku)
    await page.getByLabel("Regular price").fill("42.50")
    await page.getByLabel("Stock", { exact: true }).fill("12")
    await page.getByLabel("Low-stock threshold").fill("3")
    await page.getByLabel("Category").click()
    await page.getByRole("option", { name: categoryUpdated }).click()
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Product created")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${productName}` })).toBeVisible()

    const productResponse = await page.request.get(`http://localhost:4001/api/admin/products?search=${encodeURIComponent(sku)}`, { headers: { authorization: `Bearer ${accessToken}` } })
    expect(productResponse.ok()).toBeTruthy()
    const productBody = await productResponse.json()
    expect(productBody.data.items).toHaveLength(1)
    productId = productBody.data.items[0]._id

    await page.getByRole("button", { name: `Edit ${productName}` }).click()
    await page.getByLabel("Name").fill(productUpdated)
    await page.getByLabel("Regular price").fill("49.75")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Product updated")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${productUpdated}` })).toBeVisible()

    await page.getByRole("button", { name: `Archive ${productUpdated}` }).click()
    await expect(page.getByText("Archive product?")).toBeVisible()
    await page.getByRole("button", { name: "Archive", exact: true }).click()
    await expect(page.getByText("Product archived")).toBeVisible()

    const deleteProduct = await page.request.delete(`http://localhost:4001/api/admin/products/${productId}?permanent=true`, { headers: { authorization: `Bearer ${accessToken}` } })
    expect(deleteProduct.ok()).toBeTruthy()
    productId = ""

    await page.goto("/admin/categories")
    await page.getByRole("button", { name: `Delete ${categoryUpdated}` }).click()
    await expect(page.getByText("Delete category?")).toBeVisible()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByText("Category deleted")).toBeVisible()
    categoryId = ""
  } finally {
    if (productId) {
      await page.request.delete(`http://localhost:4001/api/admin/products/${productId}?permanent=true`, { headers: { authorization: `Bearer ${accessToken}` } })
    }
    if (categoryId) {
      await page.request.delete(`http://localhost:4001/api/admin/categories/${categoryId}`, { headers: { authorization: `Bearer ${accessToken}` } })
    }
  }

  expectCleanRuntime(signals)
})
