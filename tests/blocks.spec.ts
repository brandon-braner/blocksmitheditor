import { test, expect } from '@playwright/test';
import {
  setupEditor,
  allBlocks,
  blockAt,
  editableIn,
  focusBlockAt,
  typeSlashCommand,
  typeMarkdownShortcut,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await setupEditor(page);
});

// ============================================================
// PARAGRAPH BLOCK
// ============================================================

test.describe('Paragraph Block', () => {
  test('default block on load is a paragraph', async ({ page }) => {
    const firstBlock = blockAt(page, 0);
    await expect(firstBlock).toHaveAttribute('data-block-type', 'paragraph');
    await expect(firstBlock.locator('.bs-paragraph')).toBeVisible();
  });

  test('can type text into a paragraph', async ({ page }) => {
    await focusBlockAt(page, 0);
    const editable = editableIn(blockAt(page, 0));
    await editable.pressSequentially('Hello, world!');
    await expect(editable).toHaveText('Hello, world!');
  });

  test('pressing Enter creates a new paragraph below', async ({ page }) => {
    await focusBlockAt(page, 0);
    const editable = editableIn(blockAt(page, 0));
    await editable.pressSequentially('First line');
    await editable.press('Enter');

    await expect(allBlocks(page)).toHaveCount(2);
    const secondBlock = blockAt(page, 1);
    await expect(secondBlock).toHaveAttribute('data-block-type', 'paragraph');
  });
});

// ============================================================
// HEADING BLOCK
// ============================================================

test.describe('Heading Block', () => {
  test('created via slash command /heading', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'heading');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'heading');
    await expect(block.locator('.bs-heading')).toBeVisible();
  });

  test('H1 via markdown shortcut "# "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '# ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'heading');
    await expect(block.locator('h1.bs-heading-1')).toBeVisible();
  });

  test('H2 via markdown shortcut "## "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '## ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'heading');
    await expect(block.locator('h2.bs-heading-2')).toBeVisible();
  });

  test('H3 via markdown shortcut "### "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '### ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'heading');
    await expect(block.locator('h3.bs-heading-3')).toBeVisible();
  });

  test('can type text into a heading', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '# ');

    const editable = editableIn(blockAt(page, 0));
    await editable.pressSequentially('My Title');
    await expect(editable).toHaveText('My Title');
  });
});

// ============================================================
// BULLET LIST BLOCK
// ============================================================

test.describe('Bullet List Block', () => {
  test('created via slash command /bullet', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'bullet');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'bullet-list');
    await expect(block.locator('.bs-bullet-list')).toBeVisible();
  });

  test('created via markdown shortcut "- "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '- ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'bullet-list');
    await expect(block.locator('ul.bs-bullet-list')).toBeVisible();
  });

  test('can type text into a bullet list item', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '- ');

    const editable = blockAt(page, 0).locator('.bs-list-content');
    await editable.pressSequentially('List item text', { delay: 50 });
    await expect(editable).toContainText('List item text');
  });

  test('Enter on empty list item converts to paragraph', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '- ');

    // The block is now a bullet list with empty content — press Enter
    const editable = blockAt(page, 0).locator('.bs-list-content');
    await editable.press('Enter');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'paragraph');
  });

  test('Enter on non-empty list item creates another list item', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '- ');

    const editable = blockAt(page, 0).locator('.bs-list-content');
    await editable.pressSequentially('Item one');
    await editable.press('Enter');

    await expect(allBlocks(page)).toHaveCount(2);
    const secondBlock = blockAt(page, 1);
    await expect(secondBlock).toHaveAttribute('data-block-type', 'bullet-list');
  });
});

// ============================================================
// NUMBERED LIST BLOCK
// ============================================================

test.describe('Numbered List Block', () => {
  test('created via slash command /numbered', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'numbered');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'numbered-list');
    await expect(block.locator('.bs-numbered-list')).toBeVisible();
  });

  test('created via markdown shortcut "1. "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '1. ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'numbered-list');
    await expect(block.locator('ol.bs-numbered-list')).toBeVisible();
  });

  test('consecutive items increment the start attribute', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '1. ');

    const editable = blockAt(page, 0).locator('.bs-list-content');
    await editable.pressSequentially('First');
    await editable.press('Enter');

    // Second numbered list item
    await expect(allBlocks(page)).toHaveCount(2);
    const secondBlock = blockAt(page, 1);
    await expect(secondBlock).toHaveAttribute('data-block-type', 'numbered-list');

    // Check that ol start attribute is 2
    const ol = secondBlock.locator('ol.bs-numbered-list');
    await expect(ol).toHaveAttribute('start', '2');
  });

  test('Enter on empty numbered list item converts to paragraph', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '1. ');

    const editable = blockAt(page, 0).locator('.bs-list-content');
    await editable.press('Enter');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'paragraph');
  });
});

// ============================================================
// CODE BLOCK
// ============================================================

test.describe('Code Block', () => {
  test('created via slash command /code', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'code');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'code');
    await expect(block.locator('.bs-code-block')).toBeVisible();
  });

  test('created via markdown shortcut "```"', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '```');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'code');
    await expect(block.locator('.bs-code-block')).toBeVisible();
  });

  test('has a language selector dropdown', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'code');

    const block = blockAt(page, 0);
    const langSelect = block.locator('select.bs-code-lang');
    await expect(langSelect).toBeVisible();

    // Verify it has language options
    const options = langSelect.locator('option');
    expect(await options.count()).toBeGreaterThan(5);
  });

  test('can type code into the code block', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'code');

    const codeEl = blockAt(page, 0).locator('code');
    await codeEl.click();
    await codeEl.pressSequentially('const x = 42;');
    await expect(codeEl).toContainText('const x = 42;');
  });

  test('Tab inserts indentation', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'code');

    const codeEl = blockAt(page, 0).locator('code');
    await codeEl.click();
    await codeEl.press('Tab');
    await codeEl.pressSequentially('indented');

    const text = await codeEl.textContent();
    expect(text).toContain('  indented');
  });

  test('Escape creates a new paragraph below', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'code');

    const codeEl = blockAt(page, 0).locator('code');
    await codeEl.click();
    await codeEl.pressSequentially('some code');
    await codeEl.press('Escape');

    await expect(allBlocks(page)).toHaveCount(2);
    const secondBlock = blockAt(page, 1);
    await expect(secondBlock).toHaveAttribute('data-block-type', 'paragraph');
  });
});

// ============================================================
// QUOTE BLOCK
// ============================================================

test.describe('Quote Block', () => {
  test('created via slash command /quote', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'quote');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'quote');
    await expect(block.locator('blockquote.bs-quote')).toBeVisible();
  });

  test('created via markdown shortcut "> "', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '> ');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'quote');
    await expect(block.locator('blockquote.bs-quote')).toBeVisible();
  });

  test('can type text into a quote', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'quote');

    const editable = editableIn(blockAt(page, 0));
    await editable.pressSequentially('To be or not to be');
    await expect(editable).toHaveText('To be or not to be');
  });
});

// ============================================================
// DIVIDER BLOCK
// ============================================================

test.describe('Divider Block', () => {
  test('created via slash command /divider', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'divider');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'divider');
    await expect(block.locator('.bs-divider')).toBeVisible();
    await expect(block.locator('hr')).toBeVisible();
  });

  test('created via markdown shortcut "---"', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeMarkdownShortcut(page, '---');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'divider');
    await expect(block.locator('.bs-divider')).toBeVisible();
  });

  test('divider has no contenteditable element', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'divider');

    const block = blockAt(page, 0);
    const editables = block.locator('[contenteditable="true"]');
    await expect(editables).toHaveCount(0);
  });
});

// ============================================================
// IMAGE BLOCK
// ============================================================

test.describe('Image Block', () => {
  test('created via slash command /image', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'image');

    const block = blockAt(page, 0);
    await expect(block).toHaveAttribute('data-block-type', 'image');
    await expect(block.locator('.bs-image')).toBeVisible();
  });

  test('shows placeholder when no URL is set', async ({ page }) => {
    await focusBlockAt(page, 0);
    await typeSlashCommand(page, 'image');

    const block = blockAt(page, 0);
    const placeholder = block.locator('.bs-image-placeholder');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toHaveText('Click to add an image URL');
  });
});
