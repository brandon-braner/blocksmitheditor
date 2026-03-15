# Writing and Registering Plugins

Blocksmith plugins are the editor's main extension point. A plugin can listen to editor events, read and update document state, execute commands, and expose its own public methods through `editor.getPlugin()`.

For DOM and plugin event hooks, see [docs/events.md](/Users/brandonbraner/code/blocksmith/blocksmith_editor/docs/events.md).

## Plugin interface

Every plugin must implement the `EditorPlugin` interface:

```ts
import type { EditorPlugin, PluginContext } from '@blocksmith/editor';

export class MyPlugin implements EditorPlugin {
  readonly id = 'my-plugin';
  readonly name = 'My Plugin';

  init(context: PluginContext): void {
    // Called once when the plugin is registered
  }

  destroy(): void {
    // Called when the editor is destroyed
  }
}
```

### Required fields

- `id`: unique plugin identifier. Duplicate ids are ignored by the plugin manager.
- `name`: human-readable name for debugging and tooling.
- `init(context)`: called immediately when the plugin is registered.
- `destroy()`: called when the editor tears down.

## Plugin context

`init()` receives a `PluginContext` with access to Blocksmith's core systems:

```ts
interface PluginContext {
  readonly editorState: EditorStateInterface;
  readonly eventBus: EventBus;
  readonly commandManager: CommandManagerInterface;
}
```

### What each part is for

- `editorState`: read the current document with methods like `getBlocks()` or `toDocument()`.
- `eventBus`: subscribe to editor lifecycle events such as `state:changed`, and emit your own events if needed.
- `commandManager`: execute undoable editor commands when your plugin needs to change the document through the command layer.

`editorState` is exposed through a getter internally, so the plugin always sees the current state instance even after `editor.setDocument(...)`.

## Example plugin

This example listens for document changes, keeps a reference to the latest JSON snapshot, and exposes a helper method the host app can call later.

```ts
import type { EditorPlugin, PluginContext, EditorDocument } from '@blocksmith/editor';

export class DocumentLoggerPlugin implements EditorPlugin {
  readonly id = 'document-logger';
  readonly name = 'Document Logger';

  private context: PluginContext | null = null;
  private lastDocument: EditorDocument | null = null;

  private handleStateChanged = () => {
    if (!this.context) return;

    this.lastDocument = this.context.editorState.toDocument();
    console.log('[document-logger] document updated', this.lastDocument);
  };

  init(context: PluginContext): void {
    this.context = context;
    this.lastDocument = context.editorState.toDocument();
    context.eventBus.on('state:changed', this.handleStateChanged);
  }

  destroy(): void {
    this.context?.eventBus.off('state:changed', this.handleStateChanged);
    this.context = null;
  }

  getLatestDocument(): EditorDocument | null {
    return this.lastDocument;
  }
}
```

## Registering a plugin

There are two supported ways to register a plugin.

### 1. Register in the editor config

Pass plugin instances in the `plugins` array when creating the editor:

```ts
import { createEditor } from '@blocksmith/editor';
import { DocumentLoggerPlugin } from './DocumentLoggerPlugin';

const loggerPlugin = new DocumentLoggerPlugin();

const editor = createEditor(document.getElementById('editor-container')!, {
  placeholder: "Type '/' for commands...",
  plugins: [loggerPlugin],
});
```

This is the best option when the plugin should be available as soon as the editor starts.

### 2. Register after the editor is created

Use the public `registerPlugin()` method on the editor instance:

```ts
import { createEditor } from '@blocksmith/editor';
import { DocumentLoggerPlugin } from './DocumentLoggerPlugin';

const editor = createEditor(document.getElementById('editor-container')!, {});

editor.registerPlugin(new DocumentLoggerPlugin());
```

When you call `registerPlugin()`, Blocksmith immediately:

1. Creates the plugin context
2. Calls `plugin.init(context)`
3. Stores the plugin by id
4. Emits `plugin:registered` on the internal event bus

## Accessing a registered plugin

If your plugin exposes public methods, retrieve it later with `editor.getPlugin(id)`:

```ts
const logger = editor.getPlugin<DocumentLoggerPlugin>('document-logger');

if (logger) {
  console.log(logger.getLatestDocument());
}
```

Built-in plugins follow the same pattern. For example, the demo app registers `AutoSavePlugin`, `HTMLExportPlugin`, and `PDFExportPlugin`, then accesses them through `getPlugin(...)`.

## Lifecycle and cleanup

Plugins should clean up everything they subscribe to or schedule:

- Remove `eventBus` listeners in `destroy()`
- Clear timers and intervals
- Drop DOM references or other retained state

Blocksmith calls `destroy()` for all plugins when the editor instance is destroyed.

## Best practices

- Use a stable, unique `id`
- Store the `PluginContext` if your plugin needs it after `init()`
- Prefer subscribing to `state:changed` for document-level behavior
- Keep `destroy()` safe to call even if initialization was partial
- Expose a small public API if the host app needs to call into the plugin through `getPlugin()`

## Built-in: HTMLExportPlugin

`HTMLExportPlugin` converts the current editor document into a clean, semantic HTML page with embedded styles. No external dependencies are required.

### Setup

```ts
import { createEditor, HTMLExportPlugin } from '@blocksmith/editor';

const htmlExport = new HTMLExportPlugin();

const editor = createEditor(container, {
  plugins: [htmlExport],
});
```

### API

#### `exportHTML(title?: string): string`

Returns a complete HTML document string (including `<!DOCTYPE>`, `<head>`, and embedded CSS) representing the current editor content.

```ts
const plugin = editor.getPlugin<HTMLExportPlugin>('html-export');
const html = plugin!.exportHTML('My Document');
// html is a full HTML page ready to be saved or displayed
```

| Parameter | Type     | Default                  | Description                |
|-----------|----------|--------------------------|----------------------------|
| `title`   | `string` | `'Blocksmith Document'`  | Value for the `<title>` tag |

#### `downloadHTML(filename?: string, title?: string): void`

Creates an in-memory Blob and triggers a browser download of the HTML file.

```ts
plugin!.downloadHTML('notes.html', 'My Notes');
```

| Parameter  | Type     | Default                 | Description                        |
|------------|----------|-------------------------|------------------------------------|
| `filename` | `string` | `'document.html'`       | Name of the downloaded file        |
| `title`    | `string` | `'Blocksmith Document'` | Value for the `<title>` tag        |

### Supported block types

| Block type       | HTML output                    |
|------------------|--------------------------------|
| `paragraph`      | `<p>`                          |
| `heading`        | `<h1>` – `<h3>` (via `level`) |
| `code`           | `<pre><code>`                  |
| `quote`          | `<blockquote>`                 |
| `divider`        | `<hr>`                         |
| `image`          | `<figure>` / `<figcaption>`    |
| `bullet-list`    | `<ul>` (consecutive items grouped) |
| `numbered-list`  | `<ol>` (consecutive items grouped) |

### Supported inline marks

`bold` → `<strong>`, `italic` → `<em>`, `code` → `<code>`, `strikethrough` → `<s>`, `underline` → `<u>`, `highlight` → `<mark>`, links → `<a>`.

### Events

The plugin emits a `document:exported` event on the editor event bus after `exportHTML()` is called:

```ts
editor.on('document:exported', ({ format }) => {
  console.log(`Exported as ${format}`); // 'html'
});
```

### Using the File System Access API

For a native "Save As" dialog with full control over the filename and extension, use the browser's File System Access API instead of `downloadHTML()`:

```ts
const html = editor.exportHTML('My Document');

const handle = await window.showSaveFilePicker({
  suggestedName: 'document.html',
  types: [{ description: 'HTML Document', accept: { 'text/html': ['.html'] } }],
});
const writable = await handle.createWritable();
await writable.write(html);
await writable.close();
```

> **Note:** `showSaveFilePicker` is only available in Chromium-based browsers. Fall back to `downloadHTML()` for broader compatibility.

---

## Built-in: PDFExportPlugin

`PDFExportPlugin` exports the editor document as a PDF using the browser's native print dialog — zero external dependencies. Internally it renders the document to HTML via its own `HTMLExportPlugin` instance and then opens a print-optimised window.

### Setup

```ts
import { createEditor, PDFExportPlugin } from '@blocksmith/editor';

const pdfExport = new PDFExportPlugin();

const editor = createEditor(container, {
  plugins: [pdfExport],
});
```

> **Tip:** You do _not_ need to register `HTMLExportPlugin` separately when using `PDFExportPlugin` — the PDF plugin creates and manages its own HTML exporter internally.

### API

#### `exportPDF(title?: string): void`

Opens the browser's print dialog with a formatted HTML version of the document. The user can choose **Save as PDF** from the native dialog.

```ts
const plugin = editor.getPlugin<PDFExportPlugin>('pdf-export');
plugin!.exportPDF('Sprint Retrospective');
```

| Parameter | Type     | Default                  | Description                |
|-----------|----------|--------------------------|----------------------------|
| `title`   | `string` | `'Blocksmith Document'`  | Value for the `<title>` tag |

### How it works

1. The plugin generates a full HTML document via `HTMLExportPlugin.exportHTML()`.
2. Print-specific CSS is injected (`@media print` + `@page` rules) for clean margins, pre-wrap code blocks, and visible link URLs.
3. A new browser window is opened and `window.print()` is triggered.
4. If pop-ups are blocked, the plugin falls back to a hidden `<iframe>` and prints from there.

### Print CSS overrides

The following print-specific styles are automatically added:

```css
@media print {
  body { margin: 0; padding: 20px; max-width: none; }
  pre  { white-space: pre-wrap; word-wrap: break-word; }
  a    { color: #2563eb; text-decoration: none; }
  a::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #6b7280; }
}
@page { margin: 2cm; }
```

### Events

A `document:exported` event is emitted after the print dialog opens:

```ts
editor.on('document:exported', ({ format }) => {
  console.log(`Exported as ${format}`); // 'pdf'
});
```

---

## Public API exports

These plugin APIs are exported from the package root:

```ts
import {
  createEditor,
  type EditorPlugin,
  type PluginContext,
  PluginManager,
  AutoSavePlugin,
  HTMLExportPlugin,
  PDFExportPlugin,
} from '@blocksmith/editor';
```

In most app code, you only need `EditorPlugin`, `PluginContext`, `createEditor`, and your own plugin class.
