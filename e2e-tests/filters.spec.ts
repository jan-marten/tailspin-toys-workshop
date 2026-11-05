import { test, expect } from '@playwright/test';

test.describe('Game filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('filters by multiple categories', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const total = await cards.count();

    await page.getByLabel('Strategy').check();
    await expect(cards.filter({ visible: true })).toHaveCount(4);
    await expect(page.getByTestId('game-category').filter({ visible: true, hasNotText: 'Strategy' })).toHaveCount(0);

    await page.getByLabel('Puzzle').check();
    await expect(cards.filter({ visible: true })).toHaveCount(8);
    await expect(page.getByTestId('filter-result-count')).toHaveText(`Showing 8 of ${total} games`);
  });

  test('filters by publisher and combines with category', async ({ page }) => {
    await page.getByTestId('filter-publisher').selectOption({ label: 'GitHub Games' });
    const visible = page.getByTestId('game-card').filter({ visible: true });
    const publisherCount = await visible.count();
    expect(publisherCount).toBeGreaterThan(0);
    await expect(page.getByTestId('game-publisher').filter({ visible: true, hasNotText: 'GitHub Games' })).toHaveCount(0);

    await page.getByLabel('Strategy').check();
    await expect(visible).toHaveCount(1);
    await expect(visible.getByTestId('game-title')).toHaveText('Server Siege');
  });

  test('clears filters', async ({ page }) => {
    const total = await page.getByTestId('game-card').count();
    await page.getByLabel('Strategy').check();
    await page.getByTestId('filter-publisher').selectOption({ label: 'GitHub Games' });
    await page.getByTestId('filter-clear').click();
    await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(total);
    await expect(page).toHaveURL(/\/$/);
  });

  test('persists filters in the URL and restores them on load', async ({ page }) => {
    await page.getByLabel('Strategy').check();
    await page.getByTestId('filter-publisher').selectOption({ label: 'GitHub Games' });
    await expect(page).toHaveURL(/category=\d+/);
    await expect(page).toHaveURL(/publisher=\d+/);

    await page.reload();
    await expect(page.getByLabel('Strategy')).toBeChecked();
    await expect(page.getByTestId('filter-publisher')).not.toHaveValue('');
    await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(1);
  });

  test('is operable with the keyboard', async ({ page }) => {
    const first = page.getByTestId('filter-form').getByRole('checkbox').first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press('Space');
    await expect(first).toBeChecked();
    await page.getByTestId('filter-clear').focus();
    await page.keyboard.press('Enter');
    await expect(first).not.toBeChecked();
  });

  test('shows an empty state when no games match', async ({ page }) => {
    // The seed data covers every category/publisher pair, so detach the cards from their publishers.
    await page.getByTestId('game-card').evaluateAll((cards) =>
      cards.forEach((card) => ((card as HTMLElement).dataset.publisherId = 'none')),
    );
    await page.getByTestId('filter-publisher').selectOption({ label: 'GitHub Games' });
    await expect(page.getByTestId('filter-empty')).toContainText('No games match the selected filters.');
    await expect(page.getByTestId('games-grid')).toBeHidden();
    await expect(page.getByTestId('filter-result-count')).toHaveText(/^Showing 0 of \d+ games$/);

    await page.getByTestId('filter-clear').click();
    await expect(page.getByTestId('filter-empty')).toBeHidden();
    await expect(page.getByTestId('games-grid')).toBeVisible();
  });
});
