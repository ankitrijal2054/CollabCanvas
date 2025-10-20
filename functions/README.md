# CollabCanvas Cloud Functions

Firebase Cloud Functions for AI-powered canvas operations.

## Setup

### Prerequisites

- Node.js 22
- Firebase CLI (`npm install -g firebase-tools`)
- OpenAI API key

### Installation

```bash
cd functions
npm install
```

### Environment Variables

Backend requires a single environment variable:

**`OPENAI_API_KEY`** – Your OpenAI API key used by the AI endpoint.

For local development, create a `.env` in `functions/`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

For production, set the secret using Firebase CLI:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

> Note: The frontend calls this function via `VITE_FIREBASE_FUNCTIONS_URL` configured in the app's `.env.local`.

## Architecture

This package exposes a single HTTP endpoint that orchestrates OpenAI function-calling tools for canvas operations.

- Endpoint: `POST /aichat`
- Validates inputs with Zod
- Summarizes current canvas state to reduce token usage
- Builds a structured system prompt and invokes OpenAI
- Returns validated tool calls for the client to execute via `CanvasContext`

## Project Structure

```
functions/
├── src/
│   ├── index.ts                          # ✅ Main API endpoint
│   ├── types/
│   │   └── ai.types.ts                   # ✅ AI types
│   ├── schemas/
│   │   └── toolSchemas.ts                # ✅ Zod schemas for 16 tools
│   ├── services/
│   │   └── openaiService.ts              # ✅ OpenAI client
│   ├── tools/
│   │   └── toolDefinitions.ts            # ✅ 16 AI tool definitions
│   └── utils/
│       ├── canvasStateSummarizer.ts      # ✅ Canvas state optimizer
│       ├── systemPrompt.ts               # ✅ System prompt builder
│       └── toolValidator.ts              # ✅ Parameter validation
├── lib/                                  # Compiled JavaScript
├── package.json                          # Dependencies and scripts
└── tsconfig.json                         # TypeScript configuration
```

## Running Locally

There are two common ways to run Functions locally.

### Option A: Full emulators (recommended)

Run from the project root to emulate Auth, Realtime DB, and Functions together:

```bash
firebase emulators:start
```

The Functions base URL will be similar to:

```
http://127.0.0.1:5001/<your-project-id>/us-central1
```

Ensure the frontend `.env.local` points `VITE_FIREBASE_FUNCTIONS_URL` to that base URL.

### Option B: Functions-only serve

```bash
npm run serve
```

This starts only the Functions emulator for faster iteration.

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode for development
- `npm run serve` - Run functions locally with emulator
- `npm run deploy` - Deploy functions to Firebase
- `npm run logs` - View function logs
- `npm run lint` - Run ESLint

## Local Testing

### Quick check with curl

After starting emulators, you can POST to the local endpoint (replace `<project-id>`):

```bash
curl -s -X POST \
  http://127.0.0.1:5001/<project-id>/us-central1/aichat \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Create a red circle at 100, 200",
    "canvasId": "default",
    "userId": "local-user"
  }' | jq
```

For more thorough testing, see `LOCAL_TESTING_GUIDE.md` and the scripts in this folder.

## API Endpoints

### POST /aichat

Main AI chat endpoint for processing natural language commands.

**Request:**

```json
{
  "message": "Create a red circle at 100, 200",
  "canvasId": "default",
  "userId": "user-123",
  "conversationHistory": [...]
}
```

**Response:**

```json
{
  "success": true,
  "toolCalls": [...],
  "aiResponse": "Created a red circle at position (100, 200).",
  "aiOperationId": "ai-op-789"
}
```

## Development

### Local Testing

```bash
npm run serve
```

This starts the Firebase emulator and makes functions available at:
`http://127.0.0.1:5001/<your-project-id>/us-central1/aichat`

### Deployment

```bash
npm run deploy
```

## Dependencies

- **firebase-admin**: Firebase Admin SDK for database access
- **firebase-functions**: Firebase Functions runtime
- **openai**: OpenAI API client for GPT-4
- **zod**: Runtime type validation for tool parameters
- **cors**: CORS middleware for cross-origin requests
