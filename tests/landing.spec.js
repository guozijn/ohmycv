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

test.describe('top bar', () => {
  test('renders wordmark, language toggle, and CV link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.topbar .wordmark')).toContainText('~/zijian');
    await expect(page.locator('.topbar .lang-toggle')).toBeVisible();
    await expect(page.locator('.topbar .topbar-cv')).toBeVisible();
  });

  test('CV link in top bar has an href', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.topbar .topbar-cv');
    const href = await link.getAttribute('href');
    expect(href).not.toBeNull();
    // Either a real PDF path or '#' (no PDF available locally) — both valid.
    expect(href).toMatch(/\.pdf$|^#$/);
  });

  test('language toggle button switches html lang', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await page.locator('.lang-toggle [data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('hero', () => {
  test('renders name, tagline, and meta line', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-name')).toContainText(/[A-Za-z一-鿿]/);
    await expect(page.locator('.hero-tagline')).toBeVisible();
    await expect(page.locator('.hero-meta')).toBeVisible();
  });

  test('tagline reflects i18n homepage.tagline (English)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.hero-tagline')).toContainText('thoughtful software');
    await context.close();
  });
});

test('Escape clears the console input line', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#terminal-input');
  await input.click();
  await input.fill('partial-command');
  await input.press('Escape');
  await expect(input).toHaveValue('');
});

test.describe('selected', () => {
  test('renders one card per i18n entry', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.selected .selected-card');
    await expect(cards).toHaveCount(3);
  });

  test('each card shows kind, meta, title, body, and verb link', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.selected .selected-card').first();
    await expect(first.locator('.selected-kind')).toBeVisible();
    await expect(first.locator('.selected-meta')).toBeVisible();
    await expect(first.locator('.selected-title')).toBeVisible();
    await expect(first.locator('.selected-body')).toBeVisible();
    await expect(first.locator('.selected-link')).toBeVisible();
  });

  test('section label is shown', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.selected .section-label')).toContainText(/selected/i);
  });

  test('reduced-motion makes cards visible immediately', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const card = page.locator('.selected .selected-card').first();
    await expect(card).toHaveAttribute('data-revealed', 'true');
    await context.close();
  });
});
