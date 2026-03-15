# Hooking Into Editor Events

Blocksmith exposes events in two different ways:

- DOM `CustomEvent`s fired by the `<blocksmith-editor>` element for host applications
- Internal `EventBus` events for plugins

Use the DOM events from your app code. Use the internal event bus from a plugin.

## Listening for DOM custom events

The editor currently fires a public DOM custom event named `bs-export-html`.

### `bs-export-html`

This event is dispatched whenever `editor.exportHTML(...)` runs.

- Event name: `bs-export-html`
- Target: the `<blocksmith-editor>` element
- Bubbles: yes
- Composed: yes
- `detail` shape:

```ts
{
  html: string;
  title: string;
}
```

### Example with `createEditor()`

`createEditor()` returns the editor instance, but the underlying object is also the `<blocksmith-editor>` custom element. To attach DOM event listeners cleanly, grab the element from the container after creation:

```ts
import { createEditor } from '@blocksmith/editor';

const container = document.getElementById('editor-container')!;
const editor = createEditor(container, {});
const editorEl = container.querySelector('blocksmith-editor');

editorEl?.addEventListener('bs-export-html', (event) => {
  const customEvent = event as CustomEvent<{ html: string; title: string }>;
  console.log('Exported HTML title:', customEvent.detail.title);
  console.log('HTML length:', customEvent.detail.html.length);
});
```

### Example with the custom element directly

If you are creating the element yourself, attach the listener directly:

```ts
const editorEl = document.createElement('blocksmith-editor');

editorEl.addEventListener('bs-export-html', (event) => {
  const { html, title } = (event as CustomEvent<{ html: string; title: string }>).detail;
  console.log(title, html);
});

document.body.appendChild(editorEl);
```

## When `bs-export-html` fires

`bs-export-html` is dispatched after the editor generates HTML in either of these cases:

- `HTMLExportPlugin` is registered, so the editor uses it to render full HTML
- `HTMLExportPlugin` is not registered, so the editor creates a temporary exporter internally

That means `editor.exportHTML(...)` will still fire the DOM event even if you did not explicitly register `HTMLExportPlugin`.

## Listening to internal editor events from a plugin

Inside a plugin, use `context.eventBus.on(...)` during `init()`:

```ts
import type { EditorPlugin, PluginContext } from '@blocksmith/editor';

export class AnalyticsPlugin implements EditorPlugin {
  readonly id = 'analytics';
  readonly name = 'Analytics';

  private context: PluginContext | null = null;

  private handleStateChanged = () => {
    console.log('Document changed');
  };

  init(context: PluginContext): void {
    this.context = context;
    context.eventBus.on('state:changed', this.handleStateChanged);
  }

  destroy(): void {
    this.context?.eventBus.off('state:changed', this.handleStateChanged);
    this.context = null;
  }
}
```

## Internal event bus events

These event names are currently defined on the internal `EventBus`:

- `state:changed`
- `block:added`
- `block:removed`
- `block:updated`
- `block:moved`
- `block:focused`
- `selection:changed`
- `ai:start`
- `ai:chunk`
- `ai:complete`
- `ai:error`
- `plugin:registered`
- `plugin:unregistered`
- `document:saved`
- `document:exported`

### Common payloads

Several events include useful payload data:

- `block:added`: `{ block, index }`
- `block:removed`: `{ block, index }`
- `block:updated`: `{ block, index }`
- `block:moved`: `{ block, oldIndex, newIndex }`
- `block:focused`: `{ blockId }`
- `plugin:registered`: `{ pluginId }`
- `plugin:unregistered`: `{ pluginId }`
- `document:saved`: `{ format, key }`
- `document:exported`: `{ format }`
- `ai:start`: `{ actionId, request }`
- `ai:chunk`: `{ text, chunk }`
- `ai:complete`: `{ actionId, text }`
- `ai:error`: `{ actionId, error }`

## Important note about internal UI events

You may see events like `bs-align`, `bs-lang-change`, or `bs-image-set` in the source. Those are internal wiring events used between editor UI pieces inside the component and are not currently documented as public integration APIs for host applications.

If you want to integrate with Blocksmith from app code, prefer:

- DOM events on `<blocksmith-editor>` for public browser-level hooks
- plugins plus `context.eventBus` for deeper editor integration
