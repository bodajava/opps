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

test("admin creates, updates, and archives a product from /admin/products", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
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
  let productId = ""

  try {
    await page.goto("/admin/products")
    await page.getByRole("button", { name: "Add Product" }).click()
    await page.getByLabel("Name").fill(productName)
    await page.getByLabel("SKU").fill(sku)
    await page.getByLabel("Regular price").fill("42.50")
    await page.getByLabel("Stock", { exact: true }).fill("12")
    await page.getByLabel("Low-stock threshold").fill("3")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Product created")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${productName}` })).toBeVisible()

    const searchResponse = await page.request.get(
      `http://localhost:4001/api/admin/products?search=${encodeURIComponent(sku)}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    )
    expect(searchResponse.ok()).toBeTruthy()
    const searchBody: ProductSearchResponse = await searchResponse.json()
    expect(searchBody.data.items).toHaveLength(1)
    productId = searchBody.data.items[0]._id

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

    expect(traffic).toEqual([
      expect.objectContaining({ method: "POST", status: 201 }),
      expect.objectContaining({ method: "PATCH", status: 200 }),
      expect.objectContaining({ method: "DELETE", status: 200 }),
    ])
  } finally {
    if (productId) {
      await page.request.delete(`http://localhost:4001/api/admin/products/${productId}?permanent=true`, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    }
  }
})
