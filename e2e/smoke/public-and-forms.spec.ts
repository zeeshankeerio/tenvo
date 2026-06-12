import { test, expect } from '@playwright/test';

/**
 * Smoke: public routes + client-side validation on marketing forms.
 * Requires dev server on baseURL (see playwright.config.ts).
 */
test.describe('Public pages & marketing forms', () => {
  test('home page loads with TENVO branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TENVO/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing page shows five plan tiers', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const tierNames = ['Free', 'Starter', 'Professional', 'Business', 'Enterprise'];
    for (const name of tierNames) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('contact form blocks empty submit with validation', async ({ page }) => {
    await page.goto('/contact');
    const form = page.getByTestId('marketing-contact-form');
    await expect(form).toBeVisible();
    await form.getByRole('button', { name: 'Send Message' }).click();
    await expect(form.locator('#name-error')).toBeVisible();
  });

  test('register wizard page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('demo request page loads', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('body')).toBeVisible();
  });
});
