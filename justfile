# Load .env if it exists
set dotenv-load

# Start the LiteLLM proxy server
litellm:
    litellm --config litellm-config.yaml --port 4000

# Start the editor dev server
dev:
    npm run dev

# Start both LiteLLM and the editor
all:
    just litellm &
    just dev
