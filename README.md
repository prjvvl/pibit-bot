# Pibit Bot

A modular, AI-powered Slack bot built with TypeScript, supporting Gemini and OpenAI providers. Designed for extensibility, robust context management, and professional Slack integration.

## Features
- **Slack Integration:** Listens for mentions, replies in threads, reacts/unreacts to messages, and handles errors gracefully.
- **AI Providers:** Supports Google Gemini and OpenAI GPT models. Easily switch providers via environment variables.
- **Contextual Replies:** Maintains conversation history for context-aware responses.
- **Configurable:** Uses `.env` for secrets and provider selection.
- **Extensible Core:** Modular architecture for platforms, AI, and database/cache services.
- **Logging:** Colored, timestamped logs for info, warnings, errors, and debug.

## Project Structure
```
├── src/
│   ├── index.ts                # Entry point
│   ├── config.ts               # Loads environment/config
│   ├── ai/
│   │   ├── utils.ts            # Prompt generation, error messages
│   │   └── providers/
│   │       ├── gemini.ts       # Gemini AI provider
│   │       └── openai.ts       # OpenAI provider
│   ├── core/
│   │   ├── ai/
│   │   │   ├── providerFactory.ts   # Provider selection logic
│   │   │   └── providerInterface.ts # AI provider interface
│   │   ├── platform/
│   │   │   └── platformInterface.ts # Platform interface
│   │   └── services/
│   │       └── databaseInterface.ts # Database/cache interface
│   ├── platform/
│   │   └── slack.ts            # Slack platform implementation
│   └── services/
│       ├── logger.ts           # Logging utility
│       ├── utils.ts            # Env var verification
│       └── database/
│           └── cache.ts        # In-memory LRU cache
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config
├── .env                        # Environment variables (secrets)
├── .env.example                # Example env file
├── .gitignore                  # Ignore node_modules, dist, .env
```

## Setup
1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd pibit-bot
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment:**
   - Copy `.env.example` to `.env` and fill in your Slack and AI provider credentials.
   - Example:
     ```env
     SLACK_BOT_TOKEN=your-slack-bot-token
     SLACK_SIGNING_SECRET=your-signing-secret
     SLACK_APP_TOKEN=your-app-token
     LLM_PROVIDER=gemini # or openai
     GEMINI_API_KEY=your-gemini-key
     OPENAI_API_KEY=your-openai-key
     ```
4. **Build the project:**
   ```sh
   npm run build
   ```
5. **Run in development:**
   ```sh
   npm run dev
   ```
6. **Run in production:**
   ```sh
   npm start
   ```

## Usage
- The bot listens for `@mention` events in Slack and replies in the same thread.
- Maintains context using an in-memory LRU cache.
- Switch AI providers by changing `LLM_PROVIDER` in `.env`.

## Environment Variables
See `.env.example` for all required variables.
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`: Slack app credentials
- `LLM_PROVIDER`: `gemini` or `openai`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`: API keys for AI providers

## Extending
- **Add new platforms:** Implement the `Platform` interface in `core/platform/platformInterface.ts`.
- **Add new AI providers:** Implement the `AIProvider` interface in `core/ai/providerInterface.ts` and update `providerFactory.ts`.
- **Change cache/database:** Implement the `Database` interface in `core/services/databaseInterface.ts`.

## Scripts
- `npm run build` — Compile TypeScript to `dist/`
- `npm run dev` — Run with ts-node (development)
- `npm start` — Run compiled code (production)

## License
ISC

## Author
Prajwal Jadhav
