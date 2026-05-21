import { expect, test } from '@playwright/test'

test('landing renders the app name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vantage' })).toBeVisible()
})
