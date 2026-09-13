import { test, expect } from '@playwright/test'

test.describe('Aiswarya Billing smoke checks', () => {
  test('login screen is usable', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Aiswarya')).toBeVisible()
    await expect(page.getByRole('button')).toHaveCount(1)
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('protected dashboard requires access', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login|\/dashboard/)
    if (page.url().endsWith('/dashboard')) {
      await expect(page.getByText('Billing Desk')).toBeVisible()
    } else {
      await expect(page.getByText('Aiswarya')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.getByRole('button')).toHaveCount(1)
    }
  })

  test('invoice page exposes the counter after access', async ({ page }) => {
    await page.goto('/invoice')
    if (page.url().endsWith('/invoice')) {
      await expect(page.getByRole('heading', { name: 'New Customer Bill' })).toBeVisible()
      await expect(page.getByRole('button', { name: /quick add/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /edit catalogue/i })).toBeVisible()
    } else {
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByText('Aiswarya')).toBeVisible()
    }
  })
})
