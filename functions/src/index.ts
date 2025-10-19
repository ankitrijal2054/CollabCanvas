/**
 * Firebase Cloud Functions for CollabCanvas AI Integration
 *
 * This file contains the main API endpoints for AI-powered canvas operations.
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import cors from "cors";
import type { AICommand, AIAPIResponse, AIError } from "./types/ai.types";
import { callOpenAI, hasValidAPIKey } from "./services/openaiService";
import {
  summarizeCanvasState,
  formatCanvasStateForAI,
  type RawCanvasState,
} from "./utils/canvasStateSummarizer";
import { buildSystemPrompt } from "./utils/systemPrompt";
import { tools } from "./tools/toolDefinitions";
import {
  validateToolCalls,
  formatValidationErrors,
  validateShapeReferences,
} from "./utils/toolValidator";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Database instance for use in functions
const db = admin.database();

// Define the OpenAI API Key secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Configure CORS to allow requests from localhost and production
const corsHandler = cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    /\.web\.app$/,
    /\.firebaseapp\.com$/,
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

/**
 * AI Chat Endpoint
 *
 * POST /aichat
 *
 * Processes natural language commands and returns tool calls for execution
 */
export const aichat = onRequest(
  {
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [openaiApiKey],
  },
  async (request, response) => {
    // Handle CORS
    corsHandler(request, response, async () => {
      const startTime = Date.now();

      try {
        logger.info("AI Chat endpoint called", {
          method: request.method,
          hasBody: !!request.body,
        });

        // Handle OPTIONS preflight request
        if (request.method === "OPTIONS") {
          response.status(204).send("");
          return;
        }

        // Only accept POST requests
        if (request.method !== "POST") {
          const error: AIError = {
            success: false,
            error: "INVALID_COMMAND",
            message: "Only POST requests are accepted",
          };
          response.status(405).json(error);
          return;
        }

        // Validate request body
        const body = request.body as Partial<AICommand>;

        if (!body.message || typeof body.message !== "string") {
          const error: AIError = {
            success: false,
            error: "INVALID_COMMAND",
            message: "Missing or invalid 'message' field",
          };
          response.status(400).json(error);
          return;
        }

        if (!body.canvasId || typeof body.canvasId !== "string") {
          const error: AIError = {
            success: false,
            error: "INVALID_COMMAND",
            message: "Missing or invalid 'canvasId' field",
          };
          response.status(400).json(error);
          return;
        }

        if (!body.userId || typeof body.userId !== "string") {
          const error: AIError = {
            success: false,
            error: "AUTHENTICATION_ERROR",
            message: "Missing or invalid 'userId' field",
          };
          response.status(401).json(error);
          return;
        }

        const {
          message,
          canvasId,
          userId,
          conversationHistory = [],
          conversationContext,
          selectedIds: clientSelectedIds,
        } = body as AICommand;

        logger.info("Processing AI command", {
          userId,
          canvasId,
          messageLength: message.length,
          historyLength: conversationHistory.length,
          hasConversationContext: !!conversationContext,
          contextLength: conversationContext?.length || 0,
        });

        // Check for OpenAI API key
        if (!hasValidAPIKey()) {
          logger.error("OpenAI API key not configured");
          const error: AIError = {
            success: false,
            error: "INTERNAL_ERROR",
            message: "AI service is not configured. Please contact support.",
          };
          response.status(500).json(error);
          return;
        }

        // Load canvas state from Firebase
        logger.info("Loading canvas state from Firebase", { canvasId });
        const canvasRef = db.ref(`canvases/${canvasId}`);
        const canvasSnapshot = await canvasRef.once("value");

        if (!canvasSnapshot.exists()) {
          logger.warn("Canvas not found", { canvasId });
          const error: AIError = {
            success: false,
            error: "CANVAS_NOT_FOUND",
            message: `Canvas "${canvasId}" not found`,
          };
          response.status(404).json(error);
          return;
        }

        const rawCanvasState = canvasSnapshot.val() as RawCanvasState;
        // Inject client-provided selection for prompt context if server-side selection is empty
        if (
          clientSelectedIds &&
          (!rawCanvasState.selectedIds ||
            rawCanvasState.selectedIds.length === 0)
        ) {
          (rawCanvasState as any).clientSelectedIds = clientSelectedIds;
        }

        // Summarize canvas state for AI context
        const canvasStateSummary = summarizeCanvasState(rawCanvasState);
        const canvasStateText = formatCanvasStateForAI(canvasStateSummary);

        logger.info("Canvas state summarized", {
          objectCount: canvasStateSummary.objectCount,
          selectedCount: canvasStateSummary.selectedIds.length,
        });

        // Build system prompt with canvas context
        const systemPrompt = buildSystemPrompt(canvasStateText);

        // Call OpenAI GPT-4 with tools (with conversationContext for ReAct)
        logger.info("Calling OpenAI API", {
          hasConversationContext: !!conversationContext,
        });
        const openaiResponse = await callOpenAI({
          systemPrompt,
          userMessage: message,
          conversationHistory,
          conversationContext, // For ReAct loop iterations
          tools,
          temperature: 0.7,
          maxTokens: 2000,
        });

        logger.info("OpenAI API call completed", {
          toolCallCount: openaiResponse.toolCalls.length,
          tokensUsed: openaiResponse.tokensUsed,
        });

        // Validate tool calls
        const { validatedCalls, errors } = validateToolCalls(
          openaiResponse.toolCalls
        );

        if (errors.length > 0) {
          logger.warn("Tool validation errors", { errors });
          const error: AIError = {
            success: false,
            error: "VALIDATION_ERROR",
            message: formatValidationErrors(errors),
          };
          response.status(400).json(error);
          return;
        }

        // Validate shape references (check if referenced shape IDs exist)
        const existingIds = new Set(Object.keys(rawCanvasState.objects || {}));
        const referenceErrors = validateShapeReferences(
          validatedCalls,
          existingIds
        );

        if (referenceErrors.length > 0) {
          logger.warn("Shape reference validation errors", { referenceErrors });
          const error: AIError = {
            success: false,
            error: "VALIDATION_ERROR",
            message: `Invalid shape references: ${referenceErrors.join(", ")}`,
            suggestions: [
              "Make sure you're referencing existing shapes",
              "Use getCanvasState to see available shapes",
              "Try findShapesByColor or findShapesByType to find shapes",
            ],
          };
          response.status(400).json(error);
          return;
        }

        // Generate AI operation ID
        const aiOperationId = `ai-op-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Calculate execution time
        const executionTime = Date.now() - startTime;

        logger.info("AI command processed successfully", {
          aiOperationId,
          toolCallCount: validatedCalls.length,
          executionTime,
        });

        // Return successful response
        const successResponse: AIAPIResponse = {
          success: true,
          toolCalls: validatedCalls,
          aiResponse:
            openaiResponse.message || "Command processed successfully.",
          aiOperationId,
          executionTime,
          tokensUsed: openaiResponse.tokensUsed,
        };

        response.json(successResponse);
      } catch (error) {
        const executionTime = Date.now() - startTime;

        logger.error("AI chat endpoint error", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          executionTime,
        });

        // Determine error type
        let errorCode: AIError["error"] = "INTERNAL_ERROR";
        let message =
          "An unexpected error occurred while processing your command.";

        if (error instanceof Error) {
          if (
            error.message.includes("timeout") ||
            error.message.includes("ETIMEDOUT")
          ) {
            errorCode = "TIMEOUT";
            message =
              "The AI took too long to respond. Please try a simpler command or try again.";
          } else if (
            error.message.includes("OpenAI") ||
            error.message.includes("API")
          ) {
            errorCode = "NETWORK_ERROR";
            message = "Failed to connect to AI service. Please try again.";
          }
        }

        const errorResponse: AIError = {
          success: false,
          error: errorCode,
          message,
        };

        response.status(500).json(errorResponse);
      }
    });
  }
);
