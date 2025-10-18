# CollabCanvas - Phase 3 Task List & PR Breakdown

## Phase 3 Overview

**Mission:** Add conversational AI capabilities to CollabCanvas, enabling natural language design commands while maintaining seamless real-time collaboration.

**Core Innovation:** AI operations execute via existing Canvas Context functions—perfect sync with zero special handling.

**Simplified Scope:**

- No undo system (defer to Phase 4)
- No rate limiting (personal project)
- Minimal visual feedback (clean UI)
- Dynamic template generation (no hard-coding)
- Client-side tool execution (simpler architecture)

---

## PR Breakdown & Task Checklist

### PR #23: Firebase Cloud Functions & OpenAI Integration

**Goal:** Set up server-side infrastructure for AI command processing

- [ ] **Task 23.1: Initialize Firebase Cloud Functions**

  - Files to create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts`
  - Run: `firebase init functions` (select TypeScript)
  - Install dependencies: `firebase-functions`, `firebase-admin`, `openai`, `zod`
  - Configure: Firebase Admin SDK initialization
  - Set up: Environment variables for OpenAI API key

- [ ] **Task 23.2: Create AI types and schemas**

  - Files to create: `functions/src/types/ai.types.ts`
  - Define: `AICommand`, `ToolCall`, `ToolParameters` interfaces
  - Define: `AIResponse`, `AIError` types
  - Files to create: `functions/src/schemas/toolSchemas.ts`
  - Create: Zod schemas for all 16 tool parameters
  - Add: Validation helpers and error messages

- [ ] **Task 23.3: Set up OpenAI client**

  - Files to create: `functions/src/services/openaiService.ts`
  - Initialize: OpenAI SDK with API key from environment
  - Create: `callOpenAI()` function with GPT-4 Turbo
  - Add: Error handling and retry logic (exponential backoff, 3 attempts)
  - Add: Token usage tracking

- [ ] **Task 23.4: Create canvas state summarizer**

  - Files to create: `functions/src/utils/canvasStateSummarizer.ts`
  - Implement: `summarizeCanvasState()` function
  - Logic: Full state if <100 objects, summarized if 100+
  - Summarized format: object count, types, selected objects, recently created (last 5)
  - Add: Token estimation helper
  - Test: Summarization reduces tokens by 70%+ for large canvases

- [ ] **Task 23.5: Create system prompt builder**

  - Files to create: `functions/src/utils/systemPrompt.ts`
  - Define: System prompt with role, guidelines, and behavioral rules
  - Include: Canvas size, available shapes, default colors
  - Include: Context awareness guidelines
  - Include: Complex command generation rules (dynamic templates)
  - Keep: Flexible and adaptable (no hard-coded examples)

- [ ] **Task 23.6: Define function calling tools**

  - Files to create: `functions/src/tools/toolDefinitions.ts`
  - Define all 16 tools in OpenAI function calling format:
    - **Creation:** `createShape`, `createText`
    - **Manipulation:** `moveShape`, `resizeShape`, `rotateShape`, `deleteShape`
    - **Styling:** `updateShapeStyle`, `updateTextStyle`
    - **Layout:** `arrangeHorizontal`, `arrangeVertical`, `createGrid`, `alignShapes`, `distributeShapes`
    - **Query:** `getCanvasState`, `findShapesByColor`, `findShapesByType`
  - Add: JSON schema for each tool (parameters, types, descriptions)
  - Map: Each tool to corresponding Canvas Context function

- [ ] **Task 23.7: Create tool parameter validator**

  - Files to create: `functions/src/utils/toolValidator.ts`
  - Implement: `validateToolCall()` using Zod schemas
  - Validate: All parameters (colors, positions, sizes, references)
  - Add: Bounds checking (canvas 0-10000)
  - Add: Color validation (hex codes, named colors → hex conversion)
  - Return: Validated parameters or detailed error messages

- [ ] **Task 23.8: Create main API endpoint**

  - Files to update: `functions/src/index.ts`
  - Create: `POST /api/ai-chat` Firebase Cloud Function
  - Implement: Request structure validation
  - Add: Firebase Auth verification (reject unauthenticated)
  - Add: CORS configuration for frontend
  - Add: Request logging for debugging

- [ ] **Task 23.9: Implement API endpoint logic**

  - Files to update: `functions/src/index.ts`
  - Load: Canvas state from Firebase Realtime Database
  - Summarize: Canvas state if needed
  - Build: System prompt with context
  - Call: OpenAI GPT-4 with tools
  - Validate: Returned tool calls
  - Return: Tool calls + AI response to client
  - Add: Comprehensive error handling

- [ ] **Task 23.10: Set up environment variables**

  - Files to create: `functions/.env` (local), Firebase config (production)
  - Add: `OPENAI_API_KEY` secret to Firebase
  - Add: Firebase config variables
  - Document: Setup instructions in README

- [ ] **Task 23.11: Test API endpoint**
  - Manual testing: Call endpoint with test commands
  - Test: Authentication works (rejects unauthenticated requests)
  - Test: Canvas state loading and summarization
  - Test: OpenAI function calling returns valid tool calls
  - Test: Parameter validation catches errors
  - Test: Error responses are helpful

**PR Title:** `feat: add Firebase Cloud Functions for AI command processing`

**Testing Checklist:**

- [ ] Firebase Functions deploy successfully
- [ ] API endpoint accessible at correct URL
- [ ] OpenAI API key configured correctly
- [ ] Authentication rejects unauthenticated requests
- [ ] Canvas state loads from Firebase
- [ ] Summarization works for large canvases
- [ ] Tool calls validated with Zod
- [ ] Error responses are clear and actionable

---

### PR #24: AI Chat Panel & Client Integration

**Goal:** Build UI and client-side execution system

- [ ] **Task 24.1: Create AI types on client**

  - Files to create: `src/types/ai.types.ts`
  - Define: `AIMessage`, `ToolCall`, `AICommand` interfaces
  - Define: `AIResponse`, `AIError`, `CommandStatus` types
  - Match: Server-side types for consistency

- [ ] **Task 24.2: Create AI service**

  - Files to create: `src/services/aiService.ts`
  - Implement: `sendAICommand()` function
  - Call: Firebase Cloud Function `/api/ai-chat`
  - Handle: Authentication headers (Firebase ID token)
  - Add: Error handling and retry logic
  - Return: Tool calls + AI response

- [ ] **Task 24.3: Create AI command queue**

  - Files to create: `src/utils/aiCommandQueue.ts`
  - Implement: `AICommandQueue` class with FIFO logic
  - Per-canvas queue (stored in React context)
  - Max queue size: 5 commands
  - Add: `enqueue()`, `processQueue()`, `getQueueStatus()` methods
  - Handle: Concurrent commands from multiple users
  - Show: Queue position to users

- [ ] **Task 24.4: Create tool executor**

  - Files to create: `src/utils/aiToolExecutor.ts`
  - Implement: `executeToolCall()` function
  - Map: Each tool name to Canvas Context function
  - Execute: Tools sequentially (maintain order)
  - Handle: Tool execution errors gracefully
  - Update: Canvas state via existing Context functions

- [ ] **Task 24.5: Create AI Context**

  - Files to create: `src/contexts/AIContext.tsx`
  - Files to create: `src/hooks/useAI.ts`
  - State: Command queue, message history, loading state
  - Methods: `sendCommand()`, `clearHistory()`, `getQueueStatus()`
  - Integrate: AI command queue
  - Integrate: Tool executor
  - Store: Message history in localStorage (per user, last 10 messages)

- [ ] **Task 24.6: Create AI chat panel UI**

  - Files to create: `src/components/ai/AIChatPanel.tsx`
  - Files to create: `src/components/ai/AIChatPanel.css`
  - Location: Right sidebar, 400px wide, collapsible
  - Layout: Message history (top) + input field (bottom)
  - Add: Toggle button in header (⚡ or 🤖 icon)
  - Add: Command input with send button
  - Add: Auto-scroll to latest message

- [ ] **Task 24.7: Create chat message components**

  - Files to create: `src/components/ai/ChatMessage.tsx`
  - Files to create: `src/components/ai/ChatMessage.css`
  - Support: User messages and AI responses
  - Format: Markdown support (bold, lists, code)
  - Style: User messages (right-aligned), AI messages (left-aligned)
  - Add: Timestamp display
  - Add: Error state styling (red background)

- [ ] **Task 24.8: Create loading indicator**

  - Files to update: `src/components/ai/AIChatPanel.tsx`
  - Add: Loading spinner in chat panel
  - Message: "AI is thinking..." with animated dots
  - Show: Only to requesting user
  - Hide: When response received

- [ ] **Task 24.9: Add command suggestions**

  - Files to create: `src/components/ai/CommandSuggestions.tsx`
  - Files to create: `src/components/ai/CommandSuggestions.css`
  - Show: When chat is empty or on first use
  - Suggestions (5-8 examples):
    - "Create a red circle at 100, 200"
    - "Build a login form"
    - "Arrange selected shapes horizontally"
    - "Create a 3x3 grid of squares"
    - "Change the blue rectangle to green"
    - "Make a navigation bar with 4 menu items"
    - "Align all circles to the left"
    - "Create a card layout with title and description"
  - Click: Auto-fills input field

- [ ] **Task 24.10: Integrate AI panel with app**

  - Files to update: `src/App.tsx`
  - Add: AIContext provider (wrap application)
  - Add: AI chat panel toggle button in header
  - Add: AI chat panel component (right sidebar)
  - Ensure: Panel toggles smoothly (slide in/out animation)

- [ ] **Task 24.11: Implement command execution flow**

  - Files to update: `src/contexts/AIContext.tsx`
  - Flow: User types → validate input → call API → receive tool calls → execute tools → update UI
  - Add: Queue management (enqueue command if busy)
  - Add: Sequential tool execution
  - Add: Progress tracking (optional, for multi-step)
  - Add: Error handling (show in chat)

- [ ] **Task 24.12: Test AI chat panel**
  - Manual testing: Toggle panel open/close
  - Test: Send simple command (e.g., "create a blue circle")
  - Test: Tool calls execute correctly
  - Test: Objects appear on canvas and sync to other users
  - Test: Loading state shows during processing
  - Test: Error messages display correctly
  - Test: Command suggestions clickable
  - Test: Message history persists in localStorage

**PR Title:** `feat: implement AI chat panel and client-side tool execution`

**Testing Checklist:**

- [ ] AI panel toggles smoothly
- [ ] Command input works
- [ ] Loading indicator shows during processing
- [ ] Tool calls execute via Canvas Context
- [ ] Objects sync to all users in real-time
- [ ] Message history persists across page refresh
- [ ] Command suggestions auto-fill input
- [ ] Error messages display in chat
- [ ] Queue prevents simultaneous command conflicts

---

### PR #25: Simple AI Commands

**Goal:** Implement creation, manipulation, and styling commands

- [ ] **Task 25.1: Implement createShape tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `createShape` → Canvas Context functions
  - Support: Rectangle, Circle, Star, Line types
  - Parameters: type, x, y, width, height, color, stroke?, strokeWidth?
  - Default: Canvas center (5000, 5000) if position not specified
  - Add: Attribution (createdBy: "ai-agent", aiRequestedBy: userId)

- [ ] **Task 25.2: Implement createText tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `createText` → `CanvasContext.createText()`
  - Parameters: text, x, y, fontSize?, fontFamily?, color?
  - Defaults: fontSize: 16, fontFamily: 'Arial', color: '#000000'
  - Handle: Text content validation (<1000 chars)

- [ ] **Task 25.3: Implement moveShape tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `moveShape` → `CanvasContext.updateObject()` with x, y
  - Parameters: shapeId, x, y
  - Validate: shapeId exists in canvas state
  - Update: Position with attribution

- [ ] **Task 25.4: Implement resizeShape tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `resizeShape` → `CanvasContext.updateObject()` with width, height
  - Parameters: shapeId, width, height
  - Validate: shapeId exists, sizes are positive
  - Maintain: Aspect ratio for circles

- [ ] **Task 25.5: Implement rotateShape tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `rotateShape` → `CanvasContext.updateObject()` with rotation
  - Parameters: shapeId, degrees
  - Normalize: Degrees to 0-360 range
  - Apply: Rotation around object center

- [ ] **Task 25.6: Implement deleteShape tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `deleteShape` → `CanvasContext.deleteObject()`
  - Parameters: shapeId
  - Validate: shapeId exists before deleting
  - Handle: Gracefully if object already deleted

- [ ] **Task 25.7: Implement updateShapeStyle tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `updateShapeStyle` → `CanvasContext.updateObject()` with style props
  - Parameters: shapeId, fill?, stroke?, strokeWidth?, opacity?
  - Validate: Color formats, strokeWidth range (0-20)
  - Update: Only provided properties (partial update)

- [ ] **Task 25.8: Implement updateTextStyle tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `updateTextStyle` → `CanvasContext.updateObject()` with text props
  - Parameters: shapeId, fontSize?, fontWeight?, fontFamily?, textAlign?
  - Validate: Text-specific object type
  - Apply: Font changes immediately

- [ ] **Task 25.9: Add object reference resolution**

  - Files to create: `src/utils/objectReferenceResolver.ts`
  - Implement: Resolve "the red circle" to actual object ID
  - Support: Color-based, type-based, position-based references
  - Handle: Ambiguous references (return multiple matches)
  - Use: In tool executor before calling Canvas Context

- [ ] **Task 25.10: Test simple commands**
  - Test: "Create a red circle at 100, 200" → creates circle
  - Test: "Move the red circle to 400, 500" → moves correctly
  - Test: "Resize the circle to be twice as big" → doubles size
  - Test: "Rotate the circle 45 degrees" → rotates
  - Test: "Delete the red circle" → removes from canvas
  - Test: "Change the circle to green" → updates color
  - Test: All commands sync to other users in real-time
  - Test: Attribution shows "AI Agent (requested by [User])"

**PR Title:** `feat: implement simple AI commands (create, move, resize, delete, style)`

**Testing Checklist:**

- [ ] All 8 simple command tools work correctly
- [ ] Objects created at correct positions
- [ ] Object references resolve correctly ("the red circle")
- [ ] Ambiguous references trigger clarifying questions
- [ ] All changes sync to other users
- [ ] Attribution badges show AI agent as creator
- [ ] Error messages helpful for invalid commands
- [ ] Canvas state remains consistent

---

### PR #26: Layout & Complex AI Commands

**Goal:** Implement layout operations and dynamic template generation

- [ ] **Task 26.1: Implement arrangeHorizontal tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Parameters: shapeIds[], spacing (default: 20px)
  - Logic: Position objects in horizontal row with equal spacing
  - Use: Existing alignment helpers if applicable
  - Update: All objects with new x positions

- [ ] **Task 26.2: Implement arrangeVertical tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Parameters: shapeIds[], spacing (default: 20px)
  - Logic: Position objects in vertical column with equal spacing
  - Update: All objects with new y positions

- [ ] **Task 26.3: Implement createGrid tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Parameters: rows, cols, cellWidth, cellHeight, spacing
  - Logic: Create rows × cols objects in grid layout
  - Use: createShape for each cell
  - Calculate: Positions for grid alignment
  - Return: Array of created object IDs

- [ ] **Task 26.4: Implement alignShapes tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `alignShapes` → existing alignment functions in CanvasContext
  - Parameters: shapeIds[], alignment ('left'|'center'|'right'|'top'|'middle'|'bottom')
  - Use: `alignSelectedLeft()`, `alignSelectedRight()`, etc.
  - Temporarily: Set selection to shapeIds, align, restore selection

- [ ] **Task 26.5: Implement distributeShapes tool**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - Map: `distributeShapes` → existing distribution functions
  - Parameters: shapeIds[], direction ('horizontal'|'vertical')
  - Require: At least 3 objects (show error otherwise)
  - Apply: Even spacing between objects

- [ ] **Task 26.6: Implement query tools**

  - Files to update: `src/utils/aiToolExecutor.ts`
  - **getCanvasState:** Return current canvas state (read-only)
  - **findShapesByColor:** Filter objects by fill color
  - **findShapesByType:** Filter objects by shape type
  - Return: Object summaries (id, type, position, color)
  - Format: Conversational response (e.g., "I found 3 red circles")

- [ ] **Task 26.7: Test dynamic template generation**

  - Test: "Create a login form"
  - Expected: Title text, username label, input field, password label, input field, button, button text
  - Verify: Proper spacing (16-20px), alignment, hierarchy
  - Verify: Uses theme colors (#3B82F6 for button)
  - Test: "Build a navigation bar with 4 menu items"
  - Expected: Background rectangle + 4 text items horizontally spaced
  - Test: "Make a card layout with title and description"
  - Expected: Container, title text, description text
  - Verify: All layouts look reasonable and follow design best practices

- [ ] **Task 26.8: Handle complex multi-step commands**

  - Files to update: `src/contexts/AIContext.tsx`
  - Add: Progress tracking for multi-step commands
  - Show: "Creating login form... (3/7 steps)" to requesting user only
  - Execute: All tool calls sequentially
  - Handle: Partial failures gracefully (continue or rollback)

- [ ] **Task 26.9: Test layout commands**
  - Test: "Arrange these shapes in a horizontal row" → proper spacing
  - Test: "Create a 3x3 grid of squares" → 9 squares in grid
  - Test: "Align all circles to the left" → aligned correctly
  - Test: "Distribute these elements evenly vertically" → even spacing
  - Test: All layout commands sync to other users
  - Test: Multi-step commands show progress to requesting user

**PR Title:** `feat: implement layout commands and dynamic template generation`

**Testing Checklist:**

- [ ] arrangeHorizontal/Vertical work correctly
- [ ] createGrid generates proper grid layouts
- [ ] alignShapes uses existing alignment tools
- [ ] distributeShapes distributes evenly
- [ ] Query commands return useful information
- [ ] Complex templates (login form, nav bar, card) look good
- [ ] Multi-step progress shows to requesting user only
- [ ] All changes sync to collaborators in real-time

---

### PR #27a: ReAct Loop for Multi-Step Reasoning

**Goal:** Enable query-dependent multi-step AI operations using the ReAct (Reason + Act) pattern

**Dependencies:** PR #23, #24, #25, #26 (all previous PRs must be complete)

**Estimated Effort:** 8-12 hours (split over 2-3 days)

---

#### Task 27a.1: Update Type Definitions for ReAct

**Files to create/update:**

- `src/types/ai.types.ts`
- `functions/src/types/ai.types.ts`

**Frontend Types (`src/types/ai.types.ts`):**

```typescript
/**
 * Tool execution result with data for feedback to AI
 */
export interface ToolExecutionResult {
  tool: string;
  toolCallId?: string;
  success: boolean;
  message: string;
  data?: any;
  objectsCreated?: string[];
  objectsModified?: string[];
  error?: string;
}

/**
 * Tool category for loop control
 */
export type ToolCategory = "query" | "action";

/**
 * OpenAI conversation message format
 */
export interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

/**
 * ReAct loop configuration
 */
export interface ReActConfig {
  maxIterations: number;
  continueOnQueryTools: boolean;
  showProgress: boolean;
}
```

**Backend Types (`functions/src/types/ai.types.ts`):**

```typescript
export interface AICommand {
  message: string;
  canvasId: string;
  userId: string;
  conversationHistory?: ConversationMessage[];
  toolResults?: ToolExecutionResult[];
}

export interface AIAPIResponse {
  success: true;
  aiResponse: string;
  toolCalls: ToolCall[];
  aiOperationId: string;
  conversationContext: ConversationMessage[];
  requiresContinuation: boolean;
}
```

**Testing:**

- [ ] All type definitions compile without errors
- [ ] Types are exported correctly
- [ ] Frontend and backend types are compatible

---

#### Task 27a.2: Mark Tools as Query or Action

**Files to update:**

- `functions/src/tools/toolDefinitions.ts`

**Changes:**

1. Add `ToolDefinition` interface:

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  category: "query" | "action";
  parameters: any;
}
```

2. Update all tool definitions with `category`:

**Query Tools:**

- `findShapesByColor` → category: "query"
- `findShapesByType` → category: "query"
- `getCanvasState` → category: "query"
- `getSelectedShapes` → category: "query" (if not implemented yet)

**Action Tools:**

- All creation tools → category: "action"
- All manipulation tools → category: "action"
- All styling tools → category: "action"
- All layout tools → category: "action"

3. Update descriptions to mention ReAct:

```typescript
{
  name: "findShapesByColor",
  category: "query",
  description: "Find all shapes with a specific fill color. Returns array of shape IDs. Use the returned IDs in subsequent operations like moveShape or deleteShape.",
  // ...
}
```

**Testing:**

- [ ] All tools have `category` field
- [ ] Query tool descriptions mention follow-up usage
- [ ] No compilation errors

---

#### Task 27a.3: Update System Prompt with ReAct Guidelines

**Files to update:**

- `functions/src/utils/systemPrompt.ts`

**Add ReAct section to system prompt:**

```typescript
export function buildSystemPrompt(canvasState: any): string {
  return `You are an AI assistant for CollabCanvas, a collaborative design tool.
You help users create and manipulate shapes on a shared canvas using natural language.

Available shapes: rectangle, circle, star, line, text
Canvas size: 10000x10000px (origin at top-left: 0,0)
Default colors: #3B82F6 (blue), #EF4444 (red), #10B981 (green), #F59E0B (amber), #8B5CF6 (purple)

**Multi-Step Reasoning (ReAct Pattern):**
You can perform operations in multiple steps. The results of each step will be provided for your next decision.

**Query Tools** (gather information first):
- findShapesByColor(color) → Returns array of shape IDs and details
- findShapesByType(type) → Returns array of matching objects
- getCanvasState() → Returns all canvas objects
- getSelectedShapes() → Returns currently selected IDs

**Action Tools** (perform operations):
- All creation, manipulation, styling, and layout tools

**Example Multi-Step Workflows:**

User: "Delete all green shapes"
Step 1: Call findShapesByColor("green") to get shape IDs
Step 2: Call deleteShape() for each returned ID
Step 3: Confirm completion with friendly message

User: "Move all circles 100px to the right"
Step 1: Call findShapesByType("circle") to get all circles
Step 2: For each circle, call moveShape(id, x + 100, y)
Step 3: Confirm how many shapes were moved

User: "Make all small rectangles red"
Step 1: Call findShapesByType("rectangle")
Step 2: Filter results for width < 100 and height < 100
Step 3: Call updateShapeStyle() for each small rectangle
Step 4: Confirm changes

**Important:**
- You have up to 5 iterations to complete a task
- Always use query tools first when dealing with "all X" or "find X" patterns
- Provide progress updates: "Found 5 circles, now moving them..."
- If the task requires more than 5 steps, ask the user to break it down
- When no more actions are needed, return an empty tool calls array

Current Canvas State:
${JSON.stringify(canvasState, null, 2)}
`;
}
```

**Testing:**

- [ ] System prompt includes ReAct section
- [ ] Examples are clear and helpful
- [ ] Token count is reasonable (<1000 tokens)

---

#### Task 27a.4: Update Tool Executor to Return Detailed Results

**Files to update:**

- `src/utils/aiToolExecutor.ts`

**Note:** Query tools (`findShapesByColor`, `findShapesByType`, `getCanvasState`) have already been fixed in PR #26 to return structured data with the `data` field. Verify that all action tools also return proper `ToolExecutionResult` format.

**Create new function for batch execution with results:**

```typescript
export async function executeToolCallsWithResults(
  toolCalls: ToolCall[],
  context: CanvasContextForTools,
  userId: string,
  aiOperationId: string
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(
      toolCall,
      context,
      userId,
      aiOperationId
    );
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return results;
}
```

**Testing:**

- [ ] All tools return `ToolExecutionResult`
- [ ] Query tools return useful `data` field
- [ ] Action tools return `objectsCreated`/`objectsModified`
- [ ] Error cases return `success: false` and `error` message
- [ ] No regression in existing functionality

---

#### Task 27a.5: Implement ReAct Loop in AIContext

**Files to update:**

- `src/contexts/AIContext.tsx`

**Changes:**

1. Add ReAct configuration:

```typescript
const REACT_CONFIG: ReActConfig = {
  maxIterations: 5,
  continueOnQueryTools: true,
  showProgress: true,
};
```

2. Create `executeWithReActLoop` function:

```typescript
const executeWithReActLoop = async (
  command: AICommand,
  commandId: string
): Promise<void> => {
  let iteration = 0;
  let conversationHistory: ConversationMessage[] = [];
  let shouldContinue = true;

  // Add user message
  conversationHistory.push({
    role: "user",
    content: command.message,
  });

  while (shouldContinue && iteration < REACT_CONFIG.maxIterations) {
    iteration++;
    console.log(`[ReAct] Iteration ${iteration}/${REACT_CONFIG.maxIterations}`);

    // Show progress
    if (iteration > 1 && REACT_CONFIG.showProgress) {
      updateMessage(commandId, {
        status: "processing",
        content: `Processing step ${iteration}...`,
      });
    }

    try {
      // Send to backend with conversation history
      const response = await sendAICommand(
        {
          ...command,
          conversationHistory,
        },
        await authService.getIdToken()
      );

      if (!response.success) {
        throw new Error(response.message);
      }

      // Add assistant response to conversation
      conversationHistory.push({
        role: "assistant",
        content: null,
        tool_calls: response.toolCalls.map((tc, idx) => ({
          id: `call_${iteration}_${idx}`,
          type: "function",
          function: {
            name: tc.tool,
            arguments: JSON.stringify(tc.parameters),
          },
        })),
      });

      // Execute tool calls and get results
      const results = await executeToolCallsWithResults(
        response.toolCalls,
        canvasContext as CanvasContextForTools,
        user!.id,
        response.aiOperationId
      );

      // Add tool results to conversation
      response.toolCalls.forEach((tc, idx) => {
        conversationHistory.push({
          role: "tool",
          tool_call_id: `call_${iteration}_${idx}`,
          name: tc.tool,
          content: JSON.stringify(results[idx]),
        });
      });

      // Determine if we should continue
      const hasQueryTools = response.toolCalls.some((tc) =>
        [
          "findShapesByColor",
          "findShapesByType",
          "getCanvasState",
          "getSelectedShapes",
        ].includes(tc.tool)
      );

      const allSucceeded = results.every((r) => r.success);
      const noToolsCalled = response.toolCalls.length === 0;

      shouldContinue =
        hasQueryTools &&
        allSucceeded &&
        !noToolsCalled &&
        iteration < REACT_CONFIG.maxIterations;

      // If done, add final message
      if (!shouldContinue) {
        const aiMessage: AIMessage = {
          id: `${commandId}-response`,
          role: "assistant",
          content: response.aiResponse || `Completed in ${iteration} step(s)`,
          timestamp: Date.now(),
          status: "completed",
          toolCalls: response.toolCalls,
        };
        addMessage(aiMessage);
      }
    } catch (error) {
      console.error(`[ReAct] Iteration ${iteration} failed`, error);
      throw error;
    }
  }

  // Handle max iterations
  if (iteration >= REACT_CONFIG.maxIterations && shouldContinue) {
    addMessage({
      id: `${commandId}-warning`,
      role: "assistant",
      content:
        "The operation was partially completed but reached the maximum number of steps. Try breaking this into smaller commands.",
      timestamp: Date.now(),
      status: "completed",
    });
  }
};
```

3. Update `sendCommand` to use ReAct loop:

```typescript
const sendCommand = useCallback(
  async (message: string) => {
    // ... validation ...

    const commandId = generateCommandId();
    // ... add user message ...

    try {
      commandQueue.enqueue(queuedCommand);
      updateMessage(commandId, { status: "processing" });
      await waitForCommandProcessing(commandId);

      // Build conversation history
      const conversationHistory = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Execute with ReAct loop
      await executeWithReActLoop(
        {
          message,
          canvasId: DEFAULT_CANVAS_ID,
          userId: user.id,
          conversationHistory,
        },
        commandId
      );

      commandQueue.completeCommand(commandId, {
        success: true,
        aiResponse: "Command completed",
        toolCalls: [],
        aiOperationId: generateCommandId(),
      });

      updateMessage(commandId, { status: "completed" });
    } catch (error) {
      // ... error handling ...
    }
  },
  [user, messages, canvasContext, commandQueue, addMessage, updateMessage]
);
```

**Testing:**

- [ ] Single-step commands still work (no regression)
- [ ] Multi-step commands execute multiple iterations
- [ ] Progress shows to user during multi-step execution
- [ ] Max iterations prevents infinite loops
- [ ] Error handling works correctly
- [ ] Conversation history is maintained

---

#### Task 27a.6: Update Backend to Support Conversation History

**Files to update:**

- `functions/src/index.ts`
- `functions/src/services/openaiService.ts`

**Changes in `functions/src/index.ts`:**

```typescript
// Accept conversation history in request
const {
  message,
  canvasId,
  userId,
  conversationHistory = [],
} = body as AICommand;

// Build messages for OpenAI
const messages: any[] = [
  {
    role: "system",
    content: buildSystemPrompt(formattedCanvasState),
  },
  ...conversationHistory, // Include full conversation
];

// If this is a new conversation, add user message
if (
  !conversationHistory.some(
    (msg) => msg.role === "user" && msg.content === message
  )
) {
  messages.push({
    role: "user",
    content: message,
  });
}

// Call OpenAI with full conversation
const aiResult = await callOpenAI(messages, tools);
```

**Changes in `functions/src/services/openaiService.ts`:**

```typescript
export async function callOpenAI(
  messages: any[], // Changed from single message to array
  tools: any[]
): Promise<any> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: messages, // Use provided messages array
    tools: tools,
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0].message;
}
```

**Testing:**

- [ ] Backend accepts conversation history
- [ ] OpenAI receives full conversation context
- [ ] Tool results are properly formatted in conversation
- [ ] System prompt is only added once
- [ ] No duplicate messages in conversation

---

#### Task 27a.7: Add Feature Flag and Logging

**Files to update:**

- `src/contexts/AIContext.tsx`
- `src/constants/canvas.ts` (add feature flags)

**Add feature flag:**

```typescript
// constants/canvas.ts
export const FEATURE_FLAGS = {
  ENABLE_REACT_LOOP: true, // Can be toggled for testing
  REACT_MAX_ITERATIONS: 5,
  REACT_SHOW_PROGRESS: true,
};
```

**Add comprehensive logging:**

```typescript
// In AIContext.tsx
console.log("[ReAct] Starting loop", {
  command: message,
  maxIterations: REACT_CONFIG.maxIterations,
});

console.log("[ReAct] Iteration complete", {
  iteration,
  toolsExecuted: results.length,
  hasQueryTools,
  willContinue: shouldContinue,
  results: results.map((r) => ({
    tool: r.tool,
    success: r.success,
    message: r.message,
  })),
});

console.log("[ReAct] Loop complete", {
  totalIterations: iteration,
  finalStatus: shouldContinue ? "max_iterations" : "natural_completion",
});
```

**Testing:**

- [ ] Feature flag can enable/disable ReAct loop
- [ ] Logging provides clear execution trace
- [ ] Logs include tool results and decisions
- [ ] No sensitive data in logs

---

#### Task 27a.8: Test Multi-Step Commands

**Test Scenarios:**

**Simple Query-Then-Act:**

- [ ] "Delete all green shapes" → findShapesByColor → deleteShape for each
- [ ] "Move all circles to the right" → findShapesByType → moveShape for each
- [ ] "Make all rectangles red" → findShapesByType → updateShapeStyle for each

**Conditional Operations:**

- [ ] "Delete green circles" → findShapesByColor + findShapesByType (intersection) → delete
- [ ] "Move small shapes to the left" → getCanvasState → filter → moveShape
- [ ] "Change color of large rectangles" → findShapesByType → filter → updateShapeStyle

**Complex Multi-Step:**

- [ ] "Find all blue shapes and arrange them horizontally" → find → arrangeHorizontal
- [ ] "Get all stars and move them to the top" → findShapesByType → moveShape each
- [ ] "Select all green objects then align them left" → findShapesByColor → select → alignLeft

**Error Handling:**

- [ ] "Delete all purple shapes" (none exist) → returns friendly "no shapes found" message
- [ ] Command requiring >5 steps → shows max iterations warning
- [ ] Tool execution fails mid-loop → error handled gracefully

**Edge Cases:**

- [ ] Empty canvas → query returns empty array → AI responds appropriately
- [ ] Single shape → query works, action works
- [ ] 100+ shapes → query returns all, actions complete successfully

**Performance:**

- [ ] Single-step commands: <2s (no regression)
- [ ] 2-step commands: 3-5s
- [ ] 3-step commands: 6-8s
- [ ] Max 5 iterations: <12s

---

#### Task 27a.9: Documentation and Examples

**Files to create/update:**

- Update `README.md` with ReAct capabilities

**Add to README:**

```markdown
## AI Assistant - Multi-Step Reasoning

The AI assistant now supports multi-step operations using the ReAct pattern:

### Simple Commands (1 iteration)

- "Create a red circle at 100, 200"
- "Move shape-123 to 500, 500"
- "Delete the selected shape"

### Query-Then-Act (2 iterations)

- "Delete all green shapes"
- "Move all circles 100px right"
- "Make all rectangles larger"

### Multi-Step Operations (3+ iterations)

- "Find blue shapes and arrange them in a row"
- "Select all small objects and change them to red"
- "Get circles, align them left, then distribute evenly"

### Complex Workflows (4-5 iterations)

- "Find all green rectangles, make them blue, move to top, then rotate 45 degrees"
- "Get shapes by color, filter by size, arrange in grid, then align to center"
```

**Testing:**

- [ ] README is updated with ReAct features
- [ ] All examples are clear and accurate

---

### PR #27a Testing Checklist

**Functional Requirements:**

- [ ] Query tools return structured data
- [ ] Action tools work with query results
- [ ] ReAct loop executes multiple iterations
- [ ] Max iterations prevents infinite loops
- [ ] Error handling works at each step
- [ ] Single-step commands still work (no regression)

**Performance Requirements:**

- [ ] Single-step commands: <2s latency
- [ ] Multi-step commands: <10s latency
- [ ] No memory leaks from conversation history
- [ ] Conversation context stays under token limits

**User Experience:**

- [ ] Progress indicators show during multi-step
- [ ] Error messages are clear and actionable
- [ ] Final confirmation includes step count
- [ ] Other users see standard "AI working" message

**Integration:**

- [ ] Works with offline queue
- [ ] Works with command queue (multi-user)
- [ ] Real-time sync works for all operations
- [ ] AI attribution tracks all operations

---

### PR Title

`feat: implement ReAct loop for multi-step AI reasoning`

### PR Description

```markdown
## Summary

Implements the ReAct (Reason + Act) pattern to enable multi-step AI reasoning. The AI can now query the canvas state and perform follow-up actions based on the results.

## Key Changes

- Added `ToolExecutionResult` type for structured tool feedback
- Marked tools as "query" or "action" categories
- Updated system prompt with ReAct guidelines
- Implemented multi-iteration loop in AIContext
- Updated backend to support conversation history
- Query tools return detailed data for follow-up operations

## New Capabilities

- "Delete all green shapes" - finds shapes, then deletes them
- "Move all circles 100px right" - queries circles, then moves each
- "Make all small rectangles red" - finds + filters, then updates style
- Supports up to 5 iterations for complex multi-step operations

## Testing

- ✅ All existing single-step commands work (no regression)
- ✅ Query-then-act commands execute correctly
- ✅ Max iterations prevents infinite loops
- ✅ Error handling at each step
- ✅ Progress shown to users
- ✅ Performance: <10s for complex commands

## Breaking Changes

None - fully backward compatible

## Estimated Effort

13-20 hours (split over 2-3 days)
```

---

### PR #27: Error Handling & Polish

**Goal:** Refine error handling, add helpful messages, and test edge cases

- [ ] **Task 27.1: Improve error messages**

  - Files to update: `src/components/ai/ChatMessage.tsx`
  - Add: Error message styling (red background, warning icon)
  - Format: Clear, actionable error messages
  - Examples:
    - "I don't see a purple object on the canvas. Current objects: 2 blue rectangles, 1 red circle."
    - "Position (20000, 30000) is outside canvas bounds. Using center (5000, 5000) instead."
    - "I couldn't understand that command. Try: 'Create a red circle' or 'Move the blue square to the center'"

- [ ] **Task 27.2: Add clarifying questions**

  - Files to update: `functions/src/utils/systemPrompt.ts`
  - Guideline: Ask inline clarifying questions for ambiguous commands
  - Examples:
    - User: "make it bigger" → AI: "Which object would you like me to make bigger?"
    - User: "fix the layout" → AI: "Which objects would you like me to adjust? Try: 'Align selected shapes' or 'Distribute them evenly'"
  - Implement: In system prompt behavioral guidelines

- [ ] **Task 27.3: Handle ambiguous object references**

  - Files to update: `src/utils/objectReferenceResolver.ts`
  - If multiple matches: Return all matches to AI
  - AI response: "I found 3 blue circles. Which one? (coordinates: 100,200 | 300,400 | 500,600)"
  - If no matches: "I don't see a [color] [shape]. Would you like to create one?"

- [ ] **Task 27.4: Add destructive action confirmation**

  - Files to update: `functions/src/utils/systemPrompt.ts`
  - For commands like "delete everything": AI asks for confirmation
  - Format: "⚠️ This will delete 15 objects. Reply 'yes' to confirm or give me a different command."
  - Wait: For user's next message before executing

- [ ] **Task 27.5: Handle network errors gracefully**

  - Files to update: `src/services/aiService.ts`
  - Add: Retry logic with exponential backoff (3 attempts)
  - Show: "Lost connection. Retrying..." in chat
  - If all retries fail: "Couldn't reach AI service. Please check your connection."
  - Use: Existing offline queue if needed

- [ ] **Task 27.6: Handle OpenAI API errors**

  - Files to update: `functions/src/services/openaiService.ts`
  - Handle: Rate limits (wait and retry)
  - Handle: Timeouts (>30 seconds)
  - Handle: Invalid responses (malformed JSON)
  - Return: User-friendly error messages

- [ ] **Task 27.7: Add command validation**

  - Files to update: `src/components/ai/AIChatPanel.tsx`
  - Validate: Input not empty
  - Validate: Input length (<1000 chars)
  - Disable: Send button while processing
  - Show: Character count if approaching limit

- [ ] **Task 27.8: Add AI panel keyboard shortcuts**

  - Files to update: `src/hooks/useKeyboardShortcuts.ts`
  - Add: `Cmd/Ctrl+K` to toggle AI panel
  - Add: `Escape` to close AI panel
  - Add: `Enter` to send message (Shift+Enter for newline)
  - Document: In shortcuts help modal

- [ ] **Task 27.9: Multi-user testing**

  - Test: 2+ users issuing AI commands simultaneously
  - Verify: Per-canvas queue prevents conflicts
  - Verify: Second user sees "1 command ahead of you" message
  - Verify: Commands execute in order (no race conditions)
  - Test: User A creates objects → User B sees them appear in real-time
  - Test: User B issues command while A's is processing → queues correctly

- [ ] **Task 27.10: Edge case testing**
  - Test: Very large canvas (100+ objects) → summarization works
  - Test: Empty canvas → AI handles gracefully
  - Test: Invalid commands → helpful error messages
  - Test: Ambiguous references → clarifying questions
  - Test: Network disconnect during command → handles gracefully
  - Test: Rapid consecutive commands → queue manages correctly
  - Test: Long conversation (10+ messages) → context maintained

**PR Title:** `feat: enhance error handling and add multi-user testing`

**Testing Checklist:**

- [ ] Error messages are clear and actionable
- [ ] Clarifying questions work for ambiguous commands
- [ ] Destructive actions require confirmation
- [ ] Network errors handled gracefully
- [ ] OpenAI API errors handled gracefully
- [ ] Multi-user commands queue correctly
- [ ] All edge cases handled without crashes
- [ ] Keyboard shortcuts work for AI panel

---

### PR #28: Command History & Documentation

**Goal:** Add command history panel and complete documentation

- [ ] **Task 28.1: Create command history types**

  - Files to update: `src/types/ai.types.ts`
  - Define: `CommandHistoryEntry` interface
  - Fields: commandId, command, userId, userName, timestamp, status, executionTime, objectsCreated, objectsModified

- [ ] **Task 28.2: Set up command history in Firebase**

  - Files to update: `functions/src/index.ts`
  - Save: Each command to `/canvases/default/aiCommandHistory/{commandId}`
  - Store: Command text, user info, status, timestamp, execution time
  - Track: Objects created and modified by command
  - Limit: Store last 50 commands (auto-cleanup old ones)

- [ ] **Task 28.3: Create command history panel**

  - Files to create: `src/components/ai/CommandHistory.tsx`
  - Files to create: `src/components/ai/CommandHistory.css`
  - Location: Expandable section within AI chat panel
  - Display: Last 20 commands in reverse chronological order
  - Format: `[12:45 PM] Sarah: "Create a login form" ✓ (2.3s)`
  - Status icons: ✓ (success), ✗ (error), ⏳ (in progress)

- [ ] **Task 28.4: Add command history listener**

  - Files to create: `src/hooks/useCommandHistory.ts`
  - Subscribe: To `/canvases/default/aiCommandHistory/` in Firebase
  - Update: Real-time as new commands added
  - Store: In React state
  - Sort: By timestamp (newest first)

- [ ] **Task 28.5: Add filter functionality**

  - Files to update: `src/components/ai/CommandHistory.tsx`
  - Filter: By user (dropdown)
  - Filter: By status (success, error, in progress)
  - Filter: By date range (last hour, today, this week)
  - Show: Count of filtered results

- [ ] **Task 28.6: Integrate history with AI panel**

  - Files to update: `src/components/ai/AIChatPanel.tsx`
  - Add: "History" toggle button
  - Show/hide: Command history section
  - Default: Collapsed
  - Persist: Expanded/collapsed state in localStorage

- [ ] **Task 28.7: Create user documentation**

  - Files to create: `docs/AI_ASSISTANT_GUIDE.md`
  - Sections:
    - Getting started (how to open AI panel)
    - Command examples (all 20+ command types)
    - Best practices (effective prompting)
    - Troubleshooting (common errors and solutions)
    - Keyboard shortcuts

- [ ] **Task 28.8: Create developer documentation**

  - Files to update: `README.md`
  - Add: Phase 3 features section
  - Add: AI system architecture diagram
  - Add: Setup instructions for Firebase Functions
  - Add: OpenAI API key configuration
  - Files to update: `ai docs/architecture.md`
  - Add: AI system components
  - Add: Client-server flow diagram
  - Add: Tool execution architecture

- [ ] **Task 28.9: Create command reference**

  - Files to create: `docs/COMMAND_REFERENCE.md`
  - List: All command categories
  - Examples: For each command type
  - Parameters: Required and optional
  - Tips: For complex commands

- [ ] **Task 28.10: Update database schema documentation**

  - Files to update: `ai docs/DATABASE_SCHEMA.md`
  - Add: `aiCommandHistory` structure
  - Add: AI attribution fields (createdBy, aiOperationId, aiRequestedBy)
  - Add: Migration notes

- [ ] **Task 28.11: Add in-app help**

  - Files to update: `src/components/ai/AIChatPanel.tsx`
  - Add: "?" help button in panel header
  - Opens: Modal with command examples and tips
  - Include: Link to full documentation

- [ ] **Task 28.12: Final testing and deployment**
  - Test: All 20+ command types work end-to-end
  - Test: Command history displays and updates correctly
  - Test: Multi-user collaboration smooth with AI
  - Test: Documentation is clear and complete
  - Deploy: Firebase Functions to production
  - Deploy: Frontend to Firebase Hosting
  - Verify: All features work in production

**PR Title:** `feat: add command history and complete documentation`

**Testing Checklist:**

- [ ] Command history saves to Firebase correctly
- [ ] History displays last 20 commands
- [ ] Real-time updates as new commands added
- [ ] Filter functionality works correctly
- [ ] User documentation is clear and helpful
- [ ] Developer documentation includes setup instructions
- [ ] Command reference lists all commands with examples
- [ ] In-app help accessible from AI panel
- [ ] Production deployment successful
- [ ] All features work in production environment

---

## Phase 3 Completion Criteria

### Functional Completeness (P0 - Must Ship)

- [ ] **AI Infrastructure:**

  - [ ] Firebase Cloud Functions operational
  - [ ] OpenAI GPT-4 integration working
  - [ ] 16 function calling tools defined and validated
  - [ ] Canvas state summarization reduces tokens 70%+

- [ ] **Client Integration:**

  - [ ] AI chat panel in right sidebar (collapsible)
  - [ ] Command input and message history
  - [ ] Client-side tool executor calls Canvas Context
  - [ ] Per-canvas command queue (prevents conflicts)

- [ ] **Command Categories (All 6):**

  - [ ] Creation commands (createShape, createText)
  - [ ] Manipulation commands (move, resize, rotate, delete)
  - [ ] Styling commands (updateShapeStyle, updateTextStyle)
  - [ ] Layout commands (arrange, align, distribute, grid)
  - [ ] Query commands (getCanvasState, findShapes)
  - [ ] Selection commands (implied in queries)

- [ ] **Complex Commands:**

  - [ ] Dynamic template generation (login forms, nav bars, cards)
  - [ ] Multi-step commands execute sequentially
  - [ ] Progress shown to requesting user

- [ ] **Collaboration:**

  - [ ] AI operations sync to all users in real-time (<100ms)
  - [ ] Per-canvas queue prevents simultaneous command conflicts
  - [ ] Attribution shows "AI Agent (requested by [User])"

- [ ] **Command History:**
  - [ ] Last 20 commands saved per canvas
  - [ ] Visible to all team members
  - [ ] Real-time updates
  - [ ] Filter by user, status

### Performance Targets (Must Meet)

- [ ] **Latency:**

  - [ ] Simple commands <2 seconds (p95)
  - [ ] Complex commands <5 seconds (p95)
  - [ ] Token processing <1 second (p95)

- [ ] **Token Efficiency:**

  - [ ] Small canvases (<100 objects): ~2000 tokens max
  - [ ] Large canvases (100+ objects): ~500 tokens
  - [ ] 70-90% reduction for large canvases

- [ ] **Reliability:**
  - [ ] > 95% success rate for valid commands
  - [ ] Zero conflicts in multi-user scenarios
  - [ ] Graceful error handling for all edge cases

### User Experience

- [ ] **Usability:**

  - [ ] AI panel easily accessible (toggle button in header)
  - [ ] Command suggestions help new users
  - [ ] Error messages are clear and actionable
  - [ ] Loading indicator shows during processing

- [ ] **Visual Feedback:**
  - [ ] Simple loading spinner in chat panel
  - [ ] Attribution badge uses existing "last edited by" system
  - [ ] No special visual indicators (clean UI)

### Documentation

- [ ] **User Documentation:**

  - [ ] AI Assistant Guide (getting started, examples, tips)
  - [ ] Command Reference (all command types with examples)
  - [ ] In-app help accessible from AI panel

- [ ] **Developer Documentation:**
  - [ ] README updated with Phase 3 features
  - [ ] Architecture diagram updated
  - [ ] Setup instructions for Firebase Functions
  - [ ] Database schema documented
  - [ ] API endpoint documentation

### Deployment

- [ ] **Production Ready:**
  - [ ] Firebase Functions deployed to production
  - [ ] OpenAI API key configured securely
  - [ ] Frontend deployed to Firebase Hosting
  - [ ] All features tested in production
  - [ ] No critical bugs in first 72 hours

---

## Testing Strategy

### Unit Tests (Optional for Personal Project)

**Key areas to cover if adding tests:**

- Tool parameter validation (Zod schemas)
- Canvas state summarization
- Object reference resolution
- Tool execution mapping

### Integration Tests (Manual)

**Critical paths to test:**

1. End-to-end command flow (user types → API → tools execute → sync)
2. Multi-user command queue (no conflicts)
3. Complex template generation (login forms, nav bars)
4. Error handling (network failures, invalid commands)
5. Command history (save, display, filter)

### Multi-User Testing (Required)

**Test scenarios:**

- 2+ users issuing AI commands simultaneously
- Queue manages conflicts correctly
- All users see AI-generated content in real-time
- Attribution shows correctly for all users

### Performance Testing

**Benchmarks:**

- 50 simple commands → verify p95 <2s
- 50 complex commands → verify p95 <5s
- Large canvas (100+ objects) → verify summarization <100ms
- Token usage → verify 70%+ reduction for large canvases

### Edge Cases (Required)

**Must handle gracefully:**

- Empty canvas (no context)
- Very large canvas (100+ objects)
- Ambiguous commands
- Network failures
- Invalid object references
- Destructive operations ("delete everything")

---

## Risk Management

### High-Priority Risks

**1. Dynamic Template Quality**

- Risk: GPT-4 generates inconsistent layouts
- Mitigation: Clear guidelines in system prompt
- Contingency: Add few-shot examples if needed

**2. Multi-User Queue Conflicts**

- Risk: Race conditions between users
- Mitigation: Per-canvas FIFO queue
- Test: Extensively with 2+ users

**3. Client-Side Execution Security**

- Risk: Malicious tool calls bypass validation
- Mitigation: Validate on server before returning
- Contingency: Move to server-side execution if issues

**4. OpenAI API Costs**

- Risk: Unexpected cost spikes
- Mitigation: Monitor token usage
- Contingency: Add client-side quota if needed

---

## Notes & Best Practices

### Development Guidelines

- **Test with multiple users early** - Open 2 browser windows from start
- **Monitor token usage** - Check OpenAI dashboard regularly
- **Keep UI simple** - Resist adding complex visual feedback
- **Reuse existing code** - Leverage Canvas Context functions
- **Document as you go** - Update docs alongside code

### Firebase Functions Tips

- Use TypeScript for type safety
- Enable function logs for debugging
- Set reasonable timeout limits (60s max)
- Handle CORS properly for frontend calls
- Use environment variables for secrets

### OpenAI Integration Tips

- Use GPT-4 Turbo for best function calling
- Set temperature to 0 for consistency
- Include clear examples in system prompt
- Validate all tool calls before execution
- Track token usage for cost monitoring

---

## Success Metrics

**Phase 3 will be considered complete when:**

1. ✅ All 5 PRs merged and deployed to production
2. ✅ All 20+ command types work reliably (>95% success rate)
3. ✅ Multi-user collaboration tested and working smoothly
4. ✅ Performance targets met (<2s simple, <5s complex)
5. ✅ Token optimization reduces usage by 70%+ for large canvases
6. ✅ Documentation complete (user guide + developer docs)
7. ✅ No critical bugs after 72 hours in production
8. ✅ Personal testing shows AI generates reasonable layouts

**Post-Phase 3:**

- Phase 4 planning can begin
- Gather feedback for undo system design
- Identify areas for optimization
- Consider advanced features (voice input, multi-language, etc.)

---

**Total Estimated Time:** 4-5 weeks
**Total PRs:** 5 (PRs #23-28)
**Core Focus:** Clean, simple AI integration with zero special-case synchronization
