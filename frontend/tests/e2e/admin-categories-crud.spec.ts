import { expect, test, type Page } from "@playwright/test"
import { loadEnvFile } from "node:process"
import { resolve } from "node:path"

loadEnvFile(resolve(__dirname, "../../../backend/.env.local"))

interface CategoryTraffic {
  method: string
  url: string
  status: number
  message: string
}

interface CategorySearchResponse {
  data: {
    items: Array<{
      id?: string
      _id?: string
      name: string
      slug: string
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

async function getCategoryId(page: Page, accessToken: string, search: string): Promise<string> {
  const response = await page.request.get(
    `http://localhost:4001/api/admin/categories?search=${encodeURIComponent(search)}`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  )
  expect(response.ok()).toBeTruthy()
  const body: CategorySearchResponse = await response.json()
  expect(body.data.items.length).toBeGreaterThan(0)
  return body.data.items[0].id ?? body.data.items[0]._id ?? ""
}

test("admin category CRUD and validation regressions", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const traffic: CategoryTraffic[] = []
  page.on("response", async (response) => {
    const request = response.request()
    if (response.url().includes("/api/admin/categories") && request.method() !== "GET") {
      const body = await response.json().catch(() => ({ message: "" }))
      traffic.push({
        method: request.method(),
        url: response.url(),
        status: response.status(),
        message: typeof body.message === "string" ? body.message : "",
      })
    }
  })

  const accessToken = await loginAsAdmin(page)
  expect(accessToken).toBeTruthy()

  const suffix = `${Date.now()}-${testInfo.workerIndex}`
  const name = `CRUD Category ${suffix}`
  const updatedName = `${name} Updated`
  let categoryId = ""

  try {
    await page.goto("/admin/categories")
    await page.getByRole("button", { name: "Add Category" }).click()
    await page.getByLabel("Name").fill(name)
    await page.getByLabel("Description").fill("Temporary category")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Category created")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${name}` })).toBeVisible()
    categoryId = await getCategoryId(page, accessToken, name)
    expect(categoryId).toBeTruthy()

    await page.getByRole("button", { name: `Edit ${name}` }).click()
    await page.getByLabel("Name").fill(updatedName)
    await page.getByLabel("Description").fill("Updated category")
    await page.getByRole("button", { name: "Save" }).click()
    await expect(page.getByText("Category updated")).toBeVisible()
    await expect(page.getByRole("button", { name: `Edit ${updatedName}` })).toBeVisible()

    await page.getByRole("button", { name: "Add Category" }).click()
    await page.getByLabel("Name").fill(updatedName)
    const duplicateResponse = page.waitForResponse((response) => (
      response.url().includes("/api/admin/categories") &&
      response.request().method() === "POST" &&
      response.status() === 409
    ))
    await page.getByRole("button", { name: "Save" }).click()
    await duplicateResponse
    await expect(page.getByText(/already exists/)).toBeVisible()
    await page.getByRole("button", { name: "Cancel" }).click()

    const invalidResponse = await page.request.post("http://localhost:4001/api/admin/categories", {
      headers: { authorization: `Bearer ${accessToken}` },
      data: { name: "", sortOrder: -1 },
    })
    expect(invalidResponse.status()).toBe(400)
    const invalidBody = await invalidResponse.json()
    traffic.push({
      method: "POST",
      url: invalidResponse.url(),
      status: invalidResponse.status(),
      message: typeof invalidBody.message === "string" ? invalidBody.message : "",
    })

    const notFoundResponse = await page.request.patch(
      "http://localhost:4001/api/admin/categories/507f1f77bcf86cd799439099",
      {
        headers: { authorization: `Bearer ${accessToken}` },
        data: { name: "Missing Category" },
      },
    )
    expect(notFoundResponse.status()).toBe(404)
    const notFoundBody = await notFoundResponse.json()
    traffic.push({
      method: "PATCH",
      url: notFoundResponse.url(),
      status: notFoundResponse.status(),
      message: typeof notFoundBody.message === "string" ? notFoundBody.message : "",
    })

    const unauthorizedResponse = await page.request.post("http://localhost:4001/api/admin/categories", {
      data: { name: `Unauthorized ${suffix}` },
    })
    expect(unauthorizedResponse.status()).toBe(401)
    const unauthorizedBody = await unauthorizedResponse.json()
    traffic.push({
      method: "POST",
      url: unauthorizedResponse.url(),
      status: unauthorizedResponse.status(),
      message: typeof unauthorizedBody.message === "string" ? unauthorizedBody.message : "",
    })

    await page.getByRole("button", { name: `Delete ${updatedName}` }).click()
    await expect(page.getByText("Delete category?")).toBeVisible()
    await page.getByRole("button", { name: "Delete", exact: true }).click()
    await expect(page.getByText("Category deleted")).toBeVisible()
    categoryId = ""

    expect(traffic).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "POST", status: 201 }),
        expect.objectContaining({ method: "PATCH", status: 200 }),
        expect.objectContaining({ method: "POST", status: 409 }),
        expect.objectContaining({ method: "POST", status: 400 }),
        expect.objectContaining({ method: "PATCH", status: 404 }),
        expect.objectContaining({ method: "POST", status: 401 }),
        expect.objectContaining({ method: "DELETE", status: 200 }),
      ]),
    )
  } finally {
    if (categoryId) {
      await page.request.delete(`http://localhost:4001/api/admin/categories/${categoryId}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      })
    }
  }
})
