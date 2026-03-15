import { Page, Locator, expect } from '@playwright/test';

/**
 * Returns a locator for the editor's shadow root host element.
 */
export function editorHost(page: Page): Locator {
  return page.locator('blocksmith-editor');
}

/**
 * Returns a locator scoped inside the editor's Shadow DOM.
 * Playwright automatically pierces shadow roots when using `locator()`.
 */
export function editorRoot(page: Page): Locator {
  return page.locator('blocksmith-editor .bs-editor');
}

/**
 * Returns all block wrapper elements inside the editor.
 */
export function allBlocks(page: Page): Locator {
  return page.locator('blocksmith-editor .bs-block');
}

/**
 * Returns the block wrapper at a given 0-based index.
 */
export function blockAt(page: Page, index: number): Locator {
  return allBlocks(page).nth(index);
}

/**
 * Returns the editable content element inside a block locator.
 * Handles different block types that use different editable selectors.
 */
export function editableIn(block: Locator): Locator {
  return block.locator('[contenteditable="true"]').first();
}

/**
 * Clears localStorage to avoid loading saved editor state between tests.
 */
export async function clearEditorStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('blocksmith-doc'));
}

/**
 * Navigate to the editor and ensure it's ready.
 */
export async function setupEditor(page: Page): Promise<void> {
  await page.goto('/');
  await clearEditorStorage(page);
  await page.goto('/');
  // Wait for the editor to be present
  await expect(editorHost(page)).toBeVisible();
  // Wait for at least one block to exist
  await expect(allBlocks(page).first()).toBeVisible();
}

/**
 * Type a slash command and select it from the menu.
 * The `command` is the filter text typed after `/` (e.g., 'heading', 'code', 'bullet').
 */
export async function typeSlashCommand(page: Page, command: string): Promise<void> {
  // Find the currently focused editable or the last block's editable
  const editable = page.locator('blocksmith-editor [contenteditable="true"]:focus');
  
  // Type the slash to open the menu
  await editable.pressSequentially('/');
  
  // Wait for the slash menu to appear
  await expect(page.locator('blocksmith-editor .bs-slash-menu')).toBeVisible();
  
  // Type the filter
  if (command) {
    await editable.pressSequentially(command);
  }
  
  // Wait a tick for filter to apply, then press Enter to select
  await page.waitForTimeout(100);
  await editable.press('Enter');
  
  // Wait for menu to disappear
  await expect(page.locator('blocksmith-editor .bs-slash-menu')).not.toBeVisible();
}

/**
 * Type a markdown shortcut into the currently focused block.
 * Example: `# ` for H1, `- ` for bullet list, `> ` for quote.
 */
export async function typeMarkdownShortcut(page: Page, shortcut: string): Promise<void> {
  const editable = page.locator('blocksmith-editor [contenteditable="true"]:focus');
  await editable.pressSequentially(shortcut);
}

/**
 * Focus the editable element of a block at a given index.
 */
export async function focusBlockAt(page: Page, index: number): Promise<void> {
  const block = blockAt(page, index);
  const editable = editableIn(block);
  await editable.click();
}
