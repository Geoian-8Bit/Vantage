import { expect, test } from '@playwright/test'

test.describe('smoke público', () => {
  test('la landing muestra el nombre y los CTAs de entrar / registrarse', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Vantage' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
  })

  test('login renderiza el formulario de email + password', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('signup es accesible desde la landing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Crear cuenta' }).click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('una ruta protegida sin sesión redirige a /login con redirectTo', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard$/)
  })
})
