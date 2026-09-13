import { test, expect, type Page } from '@playwright/test'

async function isLoginScreen(page: Page) {
  return page.getByRole('heading', { name: 'Enter your PIN' }).isVisible().catch(() => false)
}

async function loginIfRequired(page: Page) {
  if (!(await isLoginScreen(page))) return false

  const pin = process.env.PLAYWRIGHT_PIN
  if (!pin) return true

  await page.getByPlaceholder('Enter PIN').fill(pin)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  return false
}

test.describe('Aiswarya Billing smoke checks', () => {
  test('login screen is usable', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Aiswarya')).toBeVisible()
    await expect(page.getByRole('button')).toHaveCount(1)
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('protected dashboard requires access', async ({ page }) => {
    await page.goto('/dashboard')
    const loginRequired = await loginIfRequired(page)

    if (loginRequired) {
      await expect(page.getByText('Aiswarya')).toBeVisible()
      await expect(page.getByPlaceholder('Enter PIN')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
      return
    }

    await expect(page.getByText('Billing Desk')).toBeVisible()
  })

  test('invoice page exposes the counter after access', async ({ page }) => {
    await page.goto('/invoice')
    const loginRequired = await loginIfRequired(page)

    if (loginRequired) {
      await expect(page).toHaveURL(/\/invoice/)
      await expect(page.getByText('Aiswarya')).toBeVisible()
      await expect(page.getByPlaceholder('Enter PIN')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
      return
    }

    await expect(page.getByRole('heading', { name: 'New Customer Bill' })).toBeVisible()
    await expect(page.getByRole('button', { name: /quick add/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /edit catalogue/i })).toBeVisible()
  })
})
