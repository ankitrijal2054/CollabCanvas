/**
 * AI Context - Manages AI command state and execution
 *
 * Provides AI chat functionality to the application
 *
 * PR #27: Added ReAct loop for multi-step reasoning
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  AIMessage,
  QueuedAICommand,
  AIState,
  ConversationMessage,
  OpenAIMessage,
  ToolExecutionResult,
  ReActConfig,
} from "../types/ai.types";
import {
  sendAICommand,
  validateAICommand,
  formatErrorMessage,
} from "../services/aiService";
import { authService } from "../services/authService";
import { AICommandQueue, generateCommandId } from "../utils/aiCommandQueue";
import {
  executeToolCallsWithResults,
  type CanvasContextForTools,
} from "../utils/aiToolExecutor";
import { useAuth } from "../hooks/useAuth";
import { useCanvas } from "../hooks/useCanvas";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";

/**
 * AI Context interface
 */
interface AIContextType extends AIState {
  sendCommand: (message: string) => Promise<void>;
  clearHistory: () => void;
  getQueueStatus: () => {
    queueLength: number;
    position: number | null;
    currentCommand: QueuedAICommand | null;
  };
  isAIPanelOpen: boolean;
  setIsAIPanelOpen: (open: boolean) => void;
  toggleAIPanel: () => void; // PR #27: Keyboard shortcut support (Cmd/Ctrl+K)
}

// Create context
const AIContext = createContext<AIContextType | undefined>(undefined);

/**
 * AI Provider Props
 */
interface AIProviderProps {
  children: ReactNode;
}

/**
 * Local storage key for message history
 */
const MESSAGE_HISTORY_KEY = "collabcanvas_ai_messages";
const MAX_STORED_MESSAGES = 10;

/**
 * ReAct Loop Configuration (PR #27)
 *
 * Can be overridden via environment variables:
 * - VITE_AI_REACT_MAX_ITERATIONS
 * - VITE_AI_REACT_ENABLED
 */
const REACT_CONFIG: ReActConfig = {
  maxIterations: Number(import.meta.env.VITE_AI_REACT_MAX_ITERATIONS) || 5,
  continueOnQueryTools: import.meta.env.VITE_AI_REACT_ENABLED !== "false", // Default: true
  showProgress: true, // Show iteration progress in UI
};

// Log ReAct configuration on initialization
console.log("[AI Context] ReAct Configuration:", {
  maxIterations: REACT_CONFIG.maxIterations,
  continueOnQueryTools: REACT_CONFIG.continueOnQueryTools,
  showProgress: REACT_CONFIG.showProgress,
});

/**
 * Query tools that trigger continuation in ReAct loop
 */
const QUERY_TOOLS = new Set([
  "getCanvasState",
  "findShapesByColor",
  "findShapesByType",
]);

/**
 * AI Provider Component
 */
export function AIProvider({ children }: AIProviderProps) {
  const { user } = useAuth();
  const canvasContext = useCanvas();

  // State
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    // Load from localStorage
    const stored = localStorage.getItem(MESSAGE_HISTORY_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as AIMessage[];
      } catch (error) {
        console.error("[AI Context] Failed to parse stored messages", error);
      }
    }
    return [];
  });

  const [queuedCommands, setQueuedCommands] = useState<QueuedAICommand[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<QueuedAICommand | null>(
    null
  );
  const [commandHistory, _setCommandHistory] = useState<any[]>([]);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // Command queue (per canvas)
  const [commandQueue] = useState(
    () =>
      new AICommandQueue(DEFAULT_CANVAS_ID, (queue, current) => {
        setQueuedCommands([...queue]);
        setCurrentCommand(current);
        setIsProcessing(!!current);
      })
  );

  // Save messages to localStorage whenever they change
  useEffect(() => {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(MESSAGE_HISTORY_KEY, JSON.stringify(toStore));
  }, [messages]);

  /**
   * Add a message to chat history
   */
  const addMessage = useCallback((message: AIMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Update a message in chat history
   */
  const updateMessage = useCallback(
    (id: string, updates: Partial<AIMessage>) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
      );
    },
    []
  );

  /**
   * Check if any query tools were used (triggers ReAct continuation)
   */
  const usedQueryTools = useCallback((toolNames: string[]): boolean => {
    return toolNames.some((name) => QUERY_TOOLS.has(name));
  }, []);

  /**
   * Convert tool execution results to OpenAI tool message format
   */
  const formatToolResultsForAI = useCallback(
    (results: ToolExecutionResult[]): string => {
      return results
        .map((result) => {
          const parts = [
            `Tool: ${result.tool}`,
            `Status: ${result.success ? "Success" : "Failed"}`,
            `Message: ${result.message}`,
          ];

          // Include structured data for query tools
          if (result.data) {
            parts.push(`Data: ${JSON.stringify(result.data, null, 2)}`);
          }

          // Include object IDs for action tools
          if (result.objectsCreated && result.objectsCreated.length > 0) {
            parts.push(`Created IDs: ${result.objectsCreated.join(", ")}`);
          }
          if (result.objectsModified && result.objectsModified.length > 0) {
            parts.push(`Modified IDs: ${result.objectsModified.join(", ")}`);
          }

          if (result.error) {
            parts.push(`Error: ${result.error}`);
          }

          return parts.join("\n");
        })
        .join("\n\n---\n\n");
    },
    []
  );

  /**
   * Send AI command with ReAct loop support
   */
  const sendCommand = useCallback(
    async (message: string) => {
      if (!user) {
        console.error(
          "[AI Context] Cannot send command: user not authenticated"
        );
        return;
      }

      // Validate command
      const validationError = validateAICommand({
        message,
        canvasId: DEFAULT_CANVAS_ID,
        userId: user.id,
      });

      if (validationError) {
        console.error("[AI Context] Command validation failed", {
          error: validationError,
        });

        // Add error message to chat
        addMessage({
          id: generateCommandId(),
          role: "assistant",
          content: validationError,
          timestamp: Date.now(),
          status: "error",
          error: validationError,
        });

        return;
      }

      // Generate command ID
      const commandId = generateCommandId();

      // Add user message to chat
      const userMessage: AIMessage = {
        id: commandId,
        role: "user",
        content: message,
        timestamp: Date.now(),
        status: "pending",
      };
      addMessage(userMessage);

      // Create queued command
      const queuedCommand: QueuedAICommand = {
        id: commandId,
        message,
        userId: user.id,
        userName: user.name || user.email || "Unknown User",
        timestamp: Date.now(),
        status: "pending",
        retryCount: 0,
      };

      try {
        // Enqueue command
        commandQueue.enqueue(queuedCommand);

        // Update user message status
        updateMessage(commandId, { status: "processing" });

        // Wait for command to be at front of queue
        await waitForCommandProcessing(commandId);

        // Get Firebase ID token for authentication
        const idToken = await authService.getIdToken();
        if (!idToken) {
          throw new Error("Failed to get authentication token");
        }

        // Build conversation history
        const conversationHistory: ConversationMessage[] = messages
          .slice(-10) // Last 10 messages
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }));

        // ===== ReAct LOOP IMPLEMENTATION (PR #27) =====
        const reactStartTime = Date.now();
        console.log("[AI Context] Starting ReAct loop", {
          commandId,
          maxIterations: REACT_CONFIG.maxIterations,
          continueOnQueryTools: REACT_CONFIG.continueOnQueryTools,
        });

        let iteration = 0;
        let shouldContinue = true;
        let conversationContext: OpenAIMessage[] = [];
        let allToolCalls: any[] = [];
        let finalResponse = "";
        let totalToolsExecuted = 0;

        while (shouldContinue && iteration < REACT_CONFIG.maxIterations) {
          iteration++;
          console.log(
            `[AI Context] ReAct iteration ${iteration}/${REACT_CONFIG.maxIterations}`
          );

          // Update UI with progress
          updateMessage(commandId, {
            status: "processing",
            content: `Processing step ${iteration}/${REACT_CONFIG.maxIterations}...`,
          });

          // Send command to server (with conversation context for iterations > 1)
          const response = await sendAICommand(
            {
              message,
              canvasId: DEFAULT_CANVAS_ID,
              userId: user.id,
              conversationHistory,
              conversationContext:
                iteration > 1 ? conversationContext : undefined,
            },
            idToken
          );

          // Check if response is error
          if (!response.success) {
            console.error("[AI Context] AI command failed", {
              commandId,
              iteration,
              error: response,
            });

            // Mark command as failed
            commandQueue.failCommand(commandId, response);

            // Add error message to chat
            const errorMessage = formatErrorMessage(response);
            addMessage({
              id: `${commandId}-error`,
              role: "assistant",
              content: errorMessage,
              timestamp: Date.now(),
              status: "error",
              error: errorMessage,
            });

            // Update user message status
            updateMessage(commandId, { status: "error", error: errorMessage });

            return;
          }

          // Store AI's response
          finalResponse = response.aiResponse;

          // Execute tool calls and get detailed results
          console.log("[AI Context] Executing tool calls", {
            commandId,
            iteration,
            toolCallCount: response.toolCalls.length,
          });

          const toolResults = await executeToolCallsWithResults(
            response.toolCalls,
            canvasContext as CanvasContextForTools,
            user.id,
            response.aiOperationId
          );

          // Track all tool calls for final display
          allToolCalls.push(...response.toolCalls);
          totalToolsExecuted += response.toolCalls.length;

          // Check if we should continue (ReAct logic)
          const toolNames = response.toolCalls.map((tc: any) => tc.tool);
          const hadQueryTools = usedQueryTools(toolNames);

          console.log("[AI Context] ReAct decision", {
            iteration,
            hadQueryTools,
            toolNames,
            continueOnQueryTools: REACT_CONFIG.continueOnQueryTools,
          });

          // Decide whether to continue
          if (
            REACT_CONFIG.continueOnQueryTools &&
            hadQueryTools &&
            iteration < REACT_CONFIG.maxIterations
          ) {
            console.log(
              `[AI Context] Continuing ReAct loop (query tools used)`
            );

            // Build conversation context for next iteration
            // Add assistant's tool calls
            conversationContext.push({
              role: "assistant",
              content: response.aiResponse,
              tool_calls: response.toolCalls.map((tc: any, idx: number) => ({
                id: `call_${iteration}_${idx}`,
                type: "function",
                function: {
                  name: tc.tool,
                  arguments: JSON.stringify(tc.parameters),
                },
              })),
            });

            // Add tool results as "tool" messages
            const toolResultMessage = formatToolResultsForAI(toolResults);
            conversationContext.push({
              role: "tool",
              content: toolResultMessage,
              tool_call_id: `call_${iteration}_0`, // Reference first tool call
            });

            shouldContinue = true;
          } else {
            console.log(`[AI Context] Stopping ReAct loop`, {
              reason: !hadQueryTools ? "no query tools" : "max iterations",
            });
            shouldContinue = false;
          }
        }

        // Calculate total execution time
        const reactTotalTime = Date.now() - reactStartTime;

        // ===== COMPREHENSIVE LOGGING SUMMARY (PR #27) =====
        console.log("═══════════════════════════════════════════");
        console.log("[AI Context] ReAct Loop Completed");
        console.log("═══════════════════════════════════════════");
        console.log("Summary:", {
          commandId,
          userMessage: message,
          totalIterations: iteration,
          maxIterations: REACT_CONFIG.maxIterations,
          totalToolsExecuted,
          uniqueTools: [...new Set(allToolCalls.map((tc: any) => tc.tool))],
          totalExecutionTime: `${reactTotalTime}ms`,
          averageTimePerIteration: `${Math.round(
            reactTotalTime / iteration
          )}ms`,
          finalResponse: finalResponse.substring(0, 100) + "...",
        });
        console.log("Tool Breakdown:");
        const toolCounts: Record<string, number> = {};
        allToolCalls.forEach((tc: any) => {
          toolCounts[tc.tool] = (toolCounts[tc.tool] || 0) + 1;
        });
        Object.entries(toolCounts).forEach(([tool, count]) => {
          console.log(`  - ${tool}: ${count} call(s)`);
        });
        console.log("═══════════════════════════════════════════");

        // Mark command as complete
        commandQueue.completeCommand(commandId, {
          success: true,
          aiResponse: finalResponse,
          toolCalls: allToolCalls,
          aiOperationId: "",
        });

        // Add final AI response to chat
        const aiMessage: AIMessage = {
          id: `${commandId}-response`,
          role: "assistant",
          content: `${finalResponse}\n\n_Completed in ${iteration} step(s) • ${totalToolsExecuted} tool(s) • ${reactTotalTime}ms_`,
          timestamp: Date.now(),
          status: "completed",
          toolCalls: allToolCalls,
        };
        addMessage(aiMessage);

        // Update user message status
        updateMessage(commandId, { status: "completed" });
      } catch (error) {
        console.error("[AI Context] Command execution error", {
          commandId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Mark command as failed
        commandQueue.failCommand(commandId, {
          success: false,
          error: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        });

        // Add error message to chat
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addMessage({
          id: `${commandId}-error`,
          role: "assistant",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
          status: "error",
          error: errorMessage,
        });

        // Update user message status
        updateMessage(commandId, { status: "error", error: errorMessage });
      }
    },
    [
      user,
      messages,
      commandQueue,
      canvasContext,
      addMessage,
      updateMessage,
      usedQueryTools,
      formatToolResultsForAI,
    ]
  );

  /**
   * Wait for command to start processing
   */
  const waitForCommandProcessing = async (commandId: string): Promise<void> => {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const status = commandQueue.getStatus();
        if (status.currentCommand?.id === commandId) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 60000);
    });
  };

  /**
   * Clear message history
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(MESSAGE_HISTORY_KEY);
  }, []);

  /**
   * Get queue status for current user
   */
  const getQueueStatus = useCallback(() => {
    const status = commandQueue.getStatus();

    // Find position of current user's pending command
    let position: number | null = null;
    const userCommand = status.pendingCommands.find(
      (cmd) => cmd.userId === user?.id
    );
    if (userCommand) {
      position = commandQueue.getCommandPosition(userCommand.id);
    }

    return {
      queueLength: status.queueLength,
      position,
      currentCommand: status.currentCommand,
    };
  }, [commandQueue, user]);

  /**
   * Toggle AI panel open/closed
   * PR #27: Keyboard shortcut support (Cmd/Ctrl+K)
   */
  const toggleAIPanel = useCallback(() => {
    setIsAIPanelOpen((prev) => !prev);
  }, []);

  // Context value
  const value: AIContextType = {
    messages,
    queuedCommands,
    isProcessing,
    currentCommand,
    commandHistory,
    sendCommand,
    clearHistory,
    getQueueStatus,
    isAIPanelOpen,
    setIsAIPanelOpen,
    toggleAIPanel,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * Hook to use AI context
 */
export function useAI(): AIContextType {
  const context = useContext(AIContext);

  if (!context) {
    throw new Error("useAI must be used within AIProvider");
  }

  return context;
}
