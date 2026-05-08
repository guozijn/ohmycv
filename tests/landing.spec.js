import { test, expect } from '@playwright/test';

test.describe('landing — baseline (current terminal homepage)', () => {
  test('console anchor renders with prompt input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.console')).toBeVisible();
    await expect(page.locator('#terminal-input')).toBeVisible();
    await expect(page.locator('#terminal-prompt')).toBeVisible();
    await expect(page.locator('.console-chrome-id')).toContainText('~/zijian');
  });

  test('terminal greeting renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#terminal-output')).not.toBeEmpty();
  });

  test('whoami command produces a non-empty response', async ({ page }) => {
    await page.goto('/');
    const output = page.locator('#terminal-output');
    await output.waitFor();
    const entriesBefore = await output.locator('.terminal-entry').count();

    const input = page.locator('#terminal-input');
    await input.click();
    await input.fill('whoami');
    await input.press('Enter');

    const entries = output.locator('.terminal-entry');
    await expect(entries).toHaveCount(entriesBefore + 1);
    const lastResponse = entries.last().locator('.terminal-response');
    await expect(lastResponse).not.toBeEmpty();
  });

  test('cv command produces a terminal response', async ({ page }) => {
    await page.goto('/');
    const output = page.locator('#terminal-output');
    await output.waitFor();
    const entriesBefore = await output.locator('.terminal-entry').count();

    const input = page.locator('#terminal-input');
    await input.click();
    await input.fill('cv');
    await input.press('Enter');

    const entries = output.locator('.terminal-entry');
    await expect(entries).toHaveCount(entriesBefore + 1);
    const lastResponse = entries.last().locator('.terminal-response');
    await expect(lastResponse).not.toBeEmpty();

    const pdfLinks = page.locator('#terminal-output a[href$=".pdf"]');
    const count = await pdfLinks.count();
    if (count > 0) {
      const href = await pdfLinks.first().getAttribute('href');
      expect(href).toMatch(/\.pdf$/);
    }
  });

  test('lang attribute is set to en for an English locale', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('#terminal-output').waitFor();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await context.close();
  });

  test('lang attribute is set to zh for a Chinese locale', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'zh-CN' });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('#terminal-output').waitFor();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await context.close();
  });
});
