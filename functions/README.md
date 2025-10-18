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

Create a `.env` file (for local development):

```
OPENAI_API_KEY=your_openai_api_key_here
```

For production, set the secret using Firebase CLI:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

## Project Structure

```
functions/
├── src/
│   ├── index.ts                          # ✅ Main API endpoint (Tasks 23.8, 23.9)
│   ├── types/
│   │   └── ai.types.ts                   # ✅ AI types (Task 23.2)
│   ├── schemas/
│   │   └── toolSchemas.ts                # ✅ Zod schemas for 16 tools (Task 23.2)
│   ├── services/
│   │   └── openaiService.ts              # ✅ OpenAI client (Task 23.3)
│   ├── tools/
│   │   └── toolDefinitions.ts            # ✅ 16 AI tool definitions (Task 23.6)
│   └── utils/
│       ├── canvasStateSummarizer.ts      # ✅ Canvas state optimizer (Task 23.4)
│       ├── systemPrompt.ts               # ✅ System prompt builder (Task 23.5)
│       └── toolValidator.ts              # ✅ Parameter validation (Task 23.7)
├── lib/                                  # Compiled JavaScript (generated)
├── package.json                          # Dependencies and scripts
└── tsconfig.json                         # TypeScript configuration
```

**Progress:** 9 out of 11 tasks complete for PR #23

- ✅ Task 23.1: Initialize Firebase Cloud Functions
- ✅ Task 23.2: Create AI types and schemas
- ✅ Task 23.3: Set up OpenAI client
- ✅ Task 23.4: Create canvas state summarizer
- ✅ Task 23.5: Create system prompt builder
- ✅ Task 23.6: Define function calling tools
- ✅ Task 23.7: Create tool parameter validator
- ✅ Task 23.8: Create main API endpoint
- ✅ Task 23.9: Implement API endpoint logic
- ⏳ Task 23.10: Set up environment variables (requires user action)
- ⏳ Task 23.11: Test API endpoint (requires deployment)

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Watch mode for development
- `npm run serve` - Run functions locally with emulator
- `npm run deploy` - Deploy functions to Firebase
- `npm run logs` - View function logs
- `npm run lint` - Run ESLint

## Local Testing

**Quick Start:**

1. Set up your OpenAI API key:

   ```bash
   cd functions
   echo "OPENAI_API_KEY=your-key" > .env
   ```

2. Start the Firebase emulator:

   ```bash
   cd ..  # Back to project root
   firebase emulators:start
   ```

3. Run tests (in a new terminal):

   ```bash
   cd functions
   ./test-ai-endpoint.sh
   ```

4. View results:
   - Terminal output shows responses
   - Emulator UI: http://localhost:4000

**Detailed Guide:** See `LOCAL_TESTING_GUIDE.md` for comprehensive testing instructions.

**Test Files:**

- `test-ai-endpoint.sh` - Automated test script
- `test-data.json` - Sample canvas data for testing
- `LOCAL_TESTING_GUIDE.md` - Complete testing documentation

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
`http://127.0.0.1:5001/collabcanvas-1fd25/us-central1/aichat`

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

## Phase 3 Implementation Status

- [x] Task 23.1: Initialize Firebase Cloud Functions
- [ ] Task 23.2: Create AI types and schemas
- [ ] Task 23.3: Set up OpenAI client
- [ ] Task 23.4: Create canvas state summarizer
- [ ] Task 23.5: Create system prompt builder
- [ ] Task 23.6: Define function calling tools
- [ ] Task 23.7: Create tool parameter validator
- [ ] Task 23.8: Create main API endpoint
- [ ] Task 23.9: Implement API endpoint logic
- [ ] Task 23.10: Set up environment variables
- [ ] Task 23.11: Test API endpoint
