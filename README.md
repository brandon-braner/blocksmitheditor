# Blocksmith Editor

A **framework-agnostic**, block-style rich text editor with built-in AI integration — think Notion, but as a drop-in Web Component you can use anywhere.

Built with vanilla TypeScript and Web Components, Blocksmith works with **React, Vue, Svelte, or plain HTML** with zero framework dependencies.

---

## ✨ Features

- **Block-based editing** — Paragraphs, headings (H1–H3), bullet lists, numbered lists, blockquotes, code blocks with syntax highlighting, dividers, and images
- **Slash commands** — Type `/` to open a command palette and insert any block type
- **Markdown shortcuts** — `#`, `##`, `###`, `-`, `1.`, `>`, `---`, and ` ``` ` are converted into blocks as you type
- **Inline formatting** — Bold (`Ctrl+B`), italic (`Ctrl+I`), underline (`Ctrl+U`), strike-through, and inline code
- **AI-powered writing** — Select text and press `Ctrl+J` to improve, proofread, simplify, reformat, or give custom instructions — powered by any OpenAI-compatible API
- **Drag & drop reordering** — Rearrange blocks with a drag handle
- **Auto-save** — Documents are serialized to JSON and can be persisted anywhere (localStorage, a database, etc.)
- **Code highlighting** — Syntax highlighting via [highlight.js](https://highlightjs.org/)

---

## 📦 Installation

### npm

```bash
npm install @blocksmith/editor
```

### From source

```bash
git clone https://github.com/your-org/blocksmith-editor.git
cd blocksmith-editor
npm install
```

---

## 🚀 Quick Start

### 1. Add the editor to your HTML

```html
<div id="editor-container"></div>

<script type="module">
  import { createEditor } from '@blocksmith/editor';

  const editor = createEditor(document.getElementById('editor-container'), {
    placeholder: "Type '/' for commands...",
  });
</script>
```

That's it! You now have a fully functional block editor.

### 2. Enable AI features

AI features require an **OpenAI-compatible API endpoint**. Blocksmith ships with an `OpenAICompatibleProvider` that works with OpenAI, Azure OpenAI, Ollama, **or any provider routed through [LiteLLM](https://docs.litellm.ai/)**.

```html
<script type="module">
  import { createEditor, OpenAICompatibleProvider } from '@blocksmith/editor';

  const aiProvider = new OpenAICompatibleProvider({
    baseUrl: 'http://localhost:4000',   // LiteLLM proxy URL
    model: 'gpt-4o',                   // Model name configured in LiteLLM
    apiKey: 'sk-your-key',             // LiteLLM master key
  });

  const editor = createEditor(document.getElementById('editor-container'), {
    placeholder: "Type '/' for commands...",
    aiProvider,
  });
</script>
```

Select any text and press **Ctrl+J** to open the AI action menu.

---

## ⚙️ Configuration

When running the demo app locally with Vite, configure AI via environment variables in a `.env` file:

```env
# LiteLLM proxy settings
LITELLM_SALT_KEY=sk-your-salt-key
LITELLM_MASTER_KEY=sk-your-master-key

# Editor AI config (talks to LiteLLM proxy)
VITE_AI_BASE_URL=http://localhost:4000
VITE_AI_MODEL=gpt-4o
VITE_AI_API_KEY=sk-your-master-key
```

| Variable | Description |
|---|---|
| `VITE_AI_BASE_URL` | URL of your LiteLLM proxy (default: `http://localhost:4000`) |
| `VITE_AI_MODEL` | The model name to request from the proxy (e.g. `gpt-4o`, `claude-3-sonnet`, `glm-4.5-flash`) |
| `VITE_AI_API_KEY` | The LiteLLM master key, sent as a Bearer token |

> [!TIP]
> If `VITE_AI_MODEL` is not set, the editor falls back to a **mock AI provider** so you can still explore the editor without any API keys.

---

## 🤖 What Is LiteLLM?

[LiteLLM](https://docs.litellm.ai/) is an **open-source AI proxy** that gives you a single, unified OpenAI-compatible API in front of 100+ LLM providers (OpenAI, Anthropic, Google, Ollama, Azure, AWS Bedrock, and more).

**Why Blocksmith uses LiteLLM:**

- **One integration, any model** — Switch between GPT-4o, Claude, Gemini, or a local Ollama model by changing a single config line — no code changes required
- **API key security** — Your provider API keys live on the proxy server, never in the browser. The browser only knows the LiteLLM master key
- **Rate limiting & budgets** — Control spending and rate limits in one place
- **Observability** — Built-in logging, Prometheus metrics, and request tracking

### How the architecture works

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐
│  Blocksmith  │──────▶│  LiteLLM     │──────▶│  OpenAI / Claude │
│  Editor      │  HTTP │  Proxy       │  HTTP │  / Ollama / etc. │
│  (browser)   │◀──────│  :4000       │◀──────│                  │
└─────────────┘       └──────────────┘       └──────────────────┘
```

The editor sends all AI requests to the LiteLLM proxy. The proxy routes them to whatever provider you've configured — the editor never talks directly to OpenAI, Anthropic, etc.

---

## 🐳 Running LiteLLM Locally with Docker

The easiest way to get started is with the included `docker-compose.yml`, which spins up:

- **LiteLLM Proxy** on port `4000`
- **PostgreSQL** database for LiteLLM state
- **Prometheus** for metrics on port `9090`

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed
- An API key for at least one AI provider (OpenAI, Anthropic, etc.) — or [Ollama](https://ollama.ai/) running locally for free local models

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-org/blocksmith-editor.git
cd blocksmith-editor
```

### Step 2 — Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
LITELLM_SALT_KEY=sk-any-random-string
LITELLM_MASTER_KEY=sk-your-master-key

VITE_AI_BASE_URL=http://localhost:4000
VITE_AI_MODEL=gpt-4o
VITE_AI_API_KEY=sk-your-master-key
```

> [!IMPORTANT]
> The `LITELLM_MASTER_KEY` is the key that protects your proxy. Set it to a secure value and use the same value for `VITE_AI_API_KEY`.

### Step 3 — Configure your models

Edit `litellm-config.yaml` to define which models the proxy should expose. Here's an example with OpenAI and Anthropic:

```yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY

  - model_name: claude-3-sonnet
    litellm_params:
      model: anthropic/claude-3-sonnet-20240229
      api_key: os.environ/ANTHROPIC_API_KEY
```

Add the corresponding API keys to your `.env`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

> [!TIP]
> LiteLLM supports [100+ providers](https://docs.litellm.ai/docs/providers). Check their docs for the correct `model` prefix for your provider.

### Step 4 — Start the services

```bash
docker compose up -d
```

Verify LiteLLM is running:

```bash
curl http://localhost:4000/health/liveliness
```

You should get `"I'm alive!"`.

### Step 5 — Start the editor

```bash
npm install
npm run dev
```

Open the URL that Vite prints (typically `http://localhost:5174`) and start writing!

### Using the LiteLLM Admin UI

LiteLLM includes a web dashboard at **http://localhost:4000/ui** where you can:

- Add and manage models
- Create API keys with budgets
- View request logs
- Monitor usage

> [!NOTE]
> For a complete Docker setup guide, see the official LiteLLM docs:
> **[LiteLLM Docker Quick Start](https://docs.litellm.ai/docs/proxy/docker_quick_start)**

---

## ☁️ Running LiteLLM in the Cloud

For production deployments, LiteLLM can be deployed to any cloud platform. Here are common options:

### Deploy to a Cloud VM (AWS EC2, GCP, Azure, DigitalOcean)

1. **Provision a VM** with Docker installed
2. **Copy your project files** (`docker-compose.yml`, `litellm-config.yaml`, `.env`) to the server
3. **Start the proxy:**

```bash
docker compose up -d
```

4. **Set up a reverse proxy** (Nginx, Caddy, etc.) with HTTPS in front of port `4000`
5. **Update your editor config** to point to the cloud URL:

```env
VITE_AI_BASE_URL=https://litellm.your-domain.com
VITE_AI_API_KEY=sk-your-master-key
```

### Deploy to a Container Platform

LiteLLM provides an official Docker image (`docker.litellm.ai/berriai/litellm:main-stable`) that works with any container platform:

- **AWS ECS / Fargate**
- **Google Cloud Run**
- **Azure Container Apps**
- **Railway / Render / Fly.io**

The key steps are always:

1. Provide the `litellm-config.yaml` as a mounted volume or config map
2. Set environment variables for `DATABASE_URL`, `LITELLM_MASTER_KEY`, and your provider API keys
3. Expose port `4000`
4. Provision a PostgreSQL database for state storage

### Production Checklist

| Item | Details |
|---|---|
| **HTTPS** | Always terminate TLS in front of the proxy |
| **Master Key** | Use a strong, randomly generated `LITELLM_MASTER_KEY` |
| **Database** | Use a managed PostgreSQL service (RDS, Cloud SQL, etc.) instead of the Docker Postgres container |
| **API Keys** | Store provider keys in a secrets manager (AWS Secrets Manager, GCP Secret Manager, Vault, etc.) |
| **Rate Limiting** | Configure rate limits and budgets in the LiteLLM UI |
| **Monitoring** | Connect Prometheus + Grafana for observability |

> [!NOTE]
> For detailed cloud deployment guides, see:
> **[LiteLLM Docker Quick Start](https://docs.litellm.ai/docs/proxy/docker_quick_start)**

---

## 🛠 Development

### Run everything locally

Using the included [justfile](https://github.com/casey/just) (install with `brew install just`):

```bash
# Start the LiteLLM proxy only
just litellm

# Start the Vite dev server only
just dev

# Start both at once
just all
```

Or manually:

```bash
# Terminal 1 — Start the LiteLLM proxy via Docker
docker compose up -d

# Terminal 2 — Start the editor dev server
npm run dev
```

### Build for production

```bash
npm run build
```

This produces ESM and UMD bundles in the `dist/` directory:

- `dist/blocksmith-editor.js` (ESM)
- `dist/blocksmith-editor.umd.cjs` (UMD)
- `dist/index.d.ts` (TypeScript types)

---

## 📖 API Reference

### `createEditor(container, config)`

Creates a new Blocksmith editor instance and mounts it into the given container element.

```typescript
import { createEditor } from '@blocksmith/editor';

const editor = createEditor(document.getElementById('editor-container'), {
  placeholder: "Type '/' for commands...",
  aiProvider,             // Optional — an AI provider instance
  onChange(doc) { },      // Optional — called on every document change
  onReady(editor) { },   // Optional — called when the editor is ready
});
```

### `OpenAICompatibleProvider`

The built-in AI provider for any OpenAI-compatible endpoint.

```typescript
import { OpenAICompatibleProvider } from '@blocksmith/editor';

const provider = new OpenAICompatibleProvider({
  baseUrl: 'http://localhost:4000',
  model: 'gpt-4o',
  apiKey: 'sk-your-key',
});
```

### Editor Instance Methods

| Method | Description |
|---|---|
| `editor.getDocument()` | Returns the current document as a JSON object |
| `editor.setDocument(doc)` | Loads a document from a JSON object |

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+J` | Open AI actions menu (with text selected) |
| `/` | Open slash command menu |
| `Esc` | Exit code block / dismiss menus |

---

## 📄 Block Types

| Type | Markdown Shortcut | Description |
|---|---|---|
| Paragraph | *(default)* | Standard text block |
| Heading 1 | `# ` | Top-level heading |
| Heading 2 | `## ` | Section heading |
| Heading 3 | `### ` | Sub-section heading |
| Bullet List | `- ` | Unordered list item |
| Numbered List | `1. ` | Ordered list item |
| Quote | `> ` | Blockquote |
| Divider | `---` | Horizontal rule |
| Code | ` ``` ` | Code block with syntax highlighting |
| Image | *(slash command)* | Image block |

---

## 📝 License

MIT — Brandon Braner
