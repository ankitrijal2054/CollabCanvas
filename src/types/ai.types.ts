/**
 * AI Types for Client-Side Integration
 *
 * Matches server-side types from functions/src/types/ai.types.ts
 */

/**
 * Message in a conversation history
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
}

/**
 * AI Command Request sent to the server
 */
export interface AICommand {
  message: string;
  canvasId: string;
  userId: string;
  conversationHistory?: ConversationMessage[];
}

/**
 * Tool call parameter for a single operation
 */
export interface ToolCallParameters {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

/**
 * Single tool call to be executed on the canvas
 */
export interface ToolCall {
  tool: string;
  parameters: ToolCallParameters;
}

/**
 * Token usage information from OpenAI
 */
export interface TokenUsage {
  input: number;
  output: number;
  total?: number;
}

/**
 * Successful API response from AI endpoint
 */
export interface AIAPIResponse {
  success: true;
  toolCalls: ToolCall[];
  aiResponse: string;
  aiOperationId: string;
  executionTime: number;
  tokensUsed: TokenUsage;
}

/**
 * Error types from AI API
 */
export type AIErrorType =
  | "INVALID_COMMAND"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "CANVAS_NOT_FOUND"
  | "INTERNAL_ERROR";

/**
 * Error response from AI endpoint
 */
export interface AIError {
  success: false;
  error: AIErrorType;
  message: string;
  suggestions?: string[];
}

/**
 * Combined API response type
 */
export type AIResponse = AIAPIResponse | AIError;

/**
 * Status of a command in the queue
 */
export type CommandStatus =
  | "pending"
  | "processing"
  | "completed"
  | "error"
  | "cancelled";

/**
 * AI message displayed in chat (includes both user and AI messages)
 */
export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  status?: CommandStatus;
  error?: string;
  toolCalls?: ToolCall[];
}

/**
 * Queued AI command waiting for execution
 */
export interface QueuedAICommand {
  id: string;
  message: string;
  userId: string;
  userName: string;
  timestamp: number;
  status: CommandStatus;
  retryCount: number;
  response?: AIAPIResponse;
  error?: AIError;
}

/**
 * Command history entry stored in Firebase
 */
export interface CommandHistoryEntry {
  commandId: string;
  command: string;
  userId: string;
  userName: string;
  timestamp: number;
  status: "success" | "error" | "cancelled";
  objectsCreated?: string[];
  objectsModified?: string[];
  executionTime?: number;
  tokensUsed?: TokenUsage;
  errorMessage?: string;
}

/**
 * AI Context state
 */
export interface AIState {
  messages: AIMessage[];
  queuedCommands: QueuedAICommand[];
  isProcessing: boolean;
  currentCommand: QueuedAICommand | null;
  commandHistory: CommandHistoryEntry[];
}
