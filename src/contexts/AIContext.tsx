/**
 * AI Context - Manages AI command state and execution
 *
 * Provides AI chat functionality to the application
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
} from "../types/ai.types";
import {
  sendAICommand,
  validateAICommand,
  formatErrorMessage,
} from "../services/aiService";
import { authService } from "../services/authService";
import { AICommandQueue, generateCommandId } from "../utils/aiCommandQueue";
import {
  executeToolCalls,
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
   * Send AI command
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

        // Send command to server
        const response = await sendAICommand(
          {
            message,
            canvasId: DEFAULT_CANVAS_ID,
            userId: user.id,
            conversationHistory,
          },
          idToken
        );

        // Check if response is error
        if (!response.success) {
          console.error("[AI Context] AI command failed", {
            commandId,
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

        // Success - execute tool calls
        console.log("[AI Context] Executing tool calls", {
          commandId,
          toolCallCount: response.toolCalls.length,
        });

        await executeToolCalls(
          response.toolCalls,
          canvasContext as CanvasContextForTools,
          user.id,
          response.aiOperationId
        );

        // Mark command as complete
        commandQueue.completeCommand(commandId, response);

        // Add AI response to chat
        const aiMessage: AIMessage = {
          id: `${commandId}-response`,
          role: "assistant",
          content: response.aiResponse,
          timestamp: Date.now(),
          status: "completed",
          toolCalls: response.toolCalls,
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
    [user, messages, commandQueue, canvasContext, addMessage, updateMessage]
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
