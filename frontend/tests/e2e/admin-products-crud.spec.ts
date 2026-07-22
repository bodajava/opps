import { expect, test, type Page } from "@playwright/test"
import { loadEnvFile } from "node:process"
import { resolve } from "node:path"

loadEnvFile(resolve(__dirname, "../../../backend/.env.local"))

interface ProductTraffic {
  method: string
  url: string
  status: number
}

interface ProductSearchResponse {
  data: {
    items: Array<{
      _id: string
      name: string
      sku: string
      isArchived: boolean
    }>
  }
}

interface RuntimeSignals {
  consoleErrors: string[]
  pageErrors: string[]
  unexpectedApiErrors: string[]
}

function monitorRuntime(page: Page): RuntimeSignals {
  const signals: RuntimeSignals = { consoleErrors: [], pageErrors: [], unexpectedApiErrors: [] }
  page.on("console", (message) => {
    if (message.type() === "error") signals.consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => signals.pageErrors.push(error.message))
  page.on("response", (response) => {
    if (response.url().includes("localhost:4001/api/") && response.status() >= 400) {
      signals.unexpectedApiErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })
  return signals
}

async function loginAsAdmin(page: Page): Promise<string> {
  const password = process.env.ADMIN_SEED_PASSWORD
  expect(password, "ADMIN_SEED_PASSWORD must be configured locally").toBeTruthy()

  await page.goto("/login")
  await page.getByLabel("Email").fill("oppsfoods.egy@gmail.com")
  await page.getByLabel("Password").fill(password ?? "")
  await page.getByRole("button", { name: "Sign In" }).click()
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 })

  return page.evaluate(() => {
    const stored = localStorage.getItem("opps-auth")
    if (!stored) return ""
    const parsed = JSON.parse(stored)
    return typeof parsed.state?.accessToken === "string" ? parsed.state.accessToken : ""
  })
}

async function createProductFromUi(page: Page, name: string, sku: string): Promise<void> {
  await page.goto("/admin/products")
  await page.getByRole("button", { name: "Add Product" }).click()
  await page.getByLabel("Name").fill(name)
  await page.getByLabel("SKU").fill(sku)
  await page.getByLabel("Regular price").fill("42.50")
  await page.getByLabel("Stock", { exact: true }).fill("12")
  await page.getByLabel("Low-stock threshold").fill("3")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Product created")).toBeVisible()
  await expect(page.getByRole("button", { name: `Edit ${name}` })).toBeVisible()
}

async function getProductId(page: Page, accessToken: string, sku: string): Promise<string> {
  const searchResponse = await page.request.get(
    `http://localhost:4001/api/admin/products?search=${encodeURIComponent(sku)}`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  )
  expect(searchResponse.ok()).toBeTruthy()
  const searchBody: ProductSearchResponse = await searchResponse.json()
  expect(searchBody.data.items).toHaveLength(1)
  return searchBody.data.items[0]._id
}

test("admin product delete and inventory flows stay consistent", async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const signals = monitorRuntime(page)
  const traffic: ProductTraffic[] = []
  page.on("response", (response) => {
    const request = response.request()
    if (response.url().includes("/api/admin/products") && request.method() !== "GET") {
      traffic.push({ method: request.method(), url: response.url(), status: response.status() })
    }
  })

  const accessToken = await loginAsAdmin(page)
  expect(accessToken).toBeTruthy()

  const suffix = `${Date.now()}-${testInfo.workerIndex}`
  const productName = `CRUD Product ${suffix}`
  const updatedName = `${productName} Updated`
  const sku = `CRUD-${suffix}`
  const linkedName = `Linked CRUD Product ${suffix}`
  const linkedSku = `LINKED-CRUD-${suffix}`
  let productId = ""
  let linkedProductId = ""

  try {
    await createProductFromUi(page, productName, sku)
    productId = await getProductId(page, accessToken, sku)

    await page.getByRole("button", { name: `Edit ${productName}` }).click()
    await page.getByLabel("Name").fill(updatedName)
    await page.getByLabel("Regular price").fill("49.75")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Product updated")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${updatedName}` })).toBeVisible()

    await page.getByRole("button", { name: `Archive ${updatedName}` }).click()
    await expect(page.getByText("Archive product?")).toBeVisible()
    await page.getByRole("button", { name: "Archive", exact: true }).click()
    await expect(page.getByText("Product archived")).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: `Edit ${updatedName}` })).toHaveCount(0)

    await createProductFromUi(page, linkedName, linkedSku)
    linkedProductId = await getProductId(page, accessToken, linkedSku)

    await page.goto("/admin/inventory")
    await expect(page.getByText("API Contract Error")).toHaveCount(0)
    await page.getByPlaceholder("Search by product or SKU...").fill(linkedSku)
    await expect(page.getByText(linkedName).filter({ visible: true })).toHaveCount(1)
    await page.getByRole("button", { name: "Adjust Stock" }).click()
    await page.getByLabel("Quantity Change").fill("1")
    await page.getByLabel("Note").fill("Regression linked product movement")
    await page.getByRole("button", { name: "Save Adjustment" }).click()
    await expect(page.getByText("Stock adjusted")).toBeVisible()

    await page.goto("/admin/products")
    await page.getByRole("button", { name: `Archive ${linkedName}` }).click()
    await expect(page.getByText("Archive product?")).toBeVisible()
    await page.getByRole("button", { name: "Archive", exact: true }).click()
    await expect(page.getByText("Product archived")).toBeVisible()
    await page.reload()
    await expect(page.getByRole("button", { name: `Edit ${linkedName}` })).toHaveCount(0)
    await page.goto("/admin/inventory")
    await expect(page.getByText("API Contract Error")).toHaveCount(0)
    await page.getByPlaceholder("Search by product or SKU...").fill(linkedSku)
    await expect(page.getByText(linkedName)).toHaveCount(0)

    expect(traffic).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "POST", status: 201 }),
        expect.objectContaining({ method: "PATCH", status: 200 }),
        expect.objectContaining({ method: "DELETE", status: 200 }),
      ]),
    )
    expect(signals.consoleErrors).toEqual([])
    expect(signals.pageErrors).toEqual([])
    expect(signals.unexpectedApiErrors).toEqual([])
  } finally {
    if (productId) {
      await page.request.delete(`http://localhost:4001/api/admin/products/${productId}?permanent=true`, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    }
    if (linkedProductId) {
      await page.request.delete(`http://localhost:4001/api/admin/products/${linkedProductId}?permanent=true`, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    }
  }
})
