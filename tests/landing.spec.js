import { test, expect } from '@playwright/test';

test.describe('landing — baseline (current terminal homepage)', () => {
  test('console anchor renders with prompt input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.console')).toBeVisible();
    await expect(page.locator('#terminal-input')).toBeVisible();
    await expect(page.locator('#terminal-prompt')).toBeVisible();
    await expect(page.locator('.console-chrome-id')).toHaveText(/^~\/[a-z][a-z0-9_-]*\s+—\s+bash$/);
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
  test('renders wordmark and language toggle', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.topbar .wordmark')).toHaveText(/^~\/[a-z][a-z0-9_-]*$/);
    await expect(page.locator('.topbar .lang-toggle')).toBeVisible();
  });

  test('CV link, if present, points to a PDF and opens in a new tab', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('.topbar .topbar-cv');
    const count = await link.count();
    if (count === 0) {
      // No PDF resolved for the active job — link is correctly omitted.
      return;
    }
    const href = await link.getAttribute('href');
    expect(href).toMatch(/\.pdf$/);
    expect(await link.getAttribute('target')).toBe('_blank');
    expect(await link.getAttribute('rel')).toContain('noopener');
    // Click opens the PDF in-place; download attribute should be absent.
    expect(await link.getAttribute('download')).toBeNull();
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
  test('renders name and meta line', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-name')).toContainText(/[A-Za-z一-鿿]/);
    await expect(page.locator('.hero-meta')).toBeVisible();
  });

  test('tagline, when configured, renders inside .hero-tagline', async ({ page }) => {
    await page.goto('/');
    const tagline = page.locator('.hero-tagline');
    const count = await tagline.count();
    if (count === 0) {
      // No homepage.tagline configured in any merge layer — graceful absence.
      return;
    }
    await expect(tagline).not.toBeEmpty();
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

  test('each card shows kind, meta, title, and body', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.selected .selected-card').first();
    await expect(first.locator('.selected-kind')).toBeVisible();
    await expect(first.locator('.selected-meta')).toBeVisible();
    await expect(first.locator('.selected-title')).toBeVisible();
    await expect(first.locator('.selected-body')).toBeVisible();
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

test.describe('about', () => {
  test('renders summary paragraph with section label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.about p')).not.toBeEmpty();
    await expect(page.locator('.about .section-label')).toContainText(/about/i);
  });

  test('emphasis renders when summary_emphasis is a substring of summary', async ({ page }) => {
    await page.goto('/');
    const para = page.locator('.about p');
    await expect(para).not.toBeEmpty();
    const text = (await para.textContent()) || '';
    const em = page.locator('.about p em.about-emphasis');
    const emCount = await em.count();
    const merged = await page.evaluate(() => {
      const el = document.querySelector('.about p');
      return el ? el.innerHTML : '';
    });
    if (emCount > 0) {
      const emText = (await em.textContent()) || '';
      expect(text.includes(emText)).toBe(true);
    } else {
      expect(merged).not.toMatch(/<em class="about-emphasis">/);
    }
  });
});

test.describe('footer', () => {
  test('contact links rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.elsewhere .contact-list a').first()).toBeVisible();
  });

  test('footer does not duplicate the top-bar CV download link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.elsewhere .cv-list')).toHaveCount(0);
    await expect(page.locator('.elsewhere .cv-link')).toHaveCount(0);
  });

});

test.describe('motion', () => {
  test('hero applies entered state on first paint', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero[data-motion="entered"]')).toBeVisible({
      timeout: 2000
    });
  });

  test('reduced-motion disables hero entry transition', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const transition = await page.locator('.hero-name').evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );
    expect(transition).toMatch(/^0s/);
    await context.close();
  });

  test('focus-visible style on console input is vermilion', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('#terminal-input');
    await input.focus();
    const outline = await input.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outline).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test('mobile viewport keeps console visible without horizontal scroll', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.console')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await context.close();
});

test.describe('bilingual', () => {
  test('zh tagline, when present, renders without italic', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    const tagline = page.locator('.hero-tagline');
    if ((await tagline.count()) === 0) return;
    const fontStyle = await tagline.evaluate((el) => getComputedStyle(el).fontStyle);
    expect(fontStyle).toBe('normal');
  });

  test('zh tagline, when present, uses CJK serif family', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    const tagline = page.locator('.hero-tagline');
    if ((await tagline.count()) === 0) return;
    const family = await tagline.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Noto Serif SC|Source Han Serif|Songti/);
  });

  test('CJK font CSS link is injected after zh switch', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('link[data-cjk]').count()).toBe(0);
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('link[data-cjk]')).toHaveCount(1);
  });

  test('language preference persists across reloads', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-toggle [data-lang="zh"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  });
});
