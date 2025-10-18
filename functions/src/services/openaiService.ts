/**
 * OpenAI Service
 *
 * Handles communication with OpenAI GPT-4 Turbo API, including
 * function calling, error handling, and retry logic.
 *
 * PR #27: Added conversationContext support for ReAct loop
 */

import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import type { AIMessage, TokenUsage, OpenAIMessage } from "../types/ai.types";

/**
 * OpenAI client instance
 */
let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
 * Lazy initialization to avoid errors if API key not set during import
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    openaiClient = new OpenAI({
      apiKey,
    });

    logger.info("OpenAI client initialized");
  }

  return openaiClient;
}

/**
 * Options for OpenAI API call
 *
 * PR #27: Added conversationContext for ReAct loop
 */
export interface OpenAICallOptions {
  systemPrompt: string;
  userMessage: string;
  conversationHistory: AIMessage[];
  conversationContext?: OpenAIMessage[]; // For ReAct loop iterations
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Response from OpenAI API call
 */
export interface OpenAIResponse {
  message: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  tokensUsed: TokenUsage;
}

/**
 * Call OpenAI GPT-4 Turbo with function calling
 * Includes retry logic with exponential backoff
 *
 * @param options - OpenAI call options
 * @returns OpenAI response with tool calls and token usage
 */
export async function callOpenAI(
  options: OpenAICallOptions
): Promise<OpenAIResponse> {
  const {
    systemPrompt,
    userMessage,
    conversationHistory,
    conversationContext,
    tools,
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  const maxRetries = 3;
  let lastError: Error | null = null;

  // Build messages array
  // For ReAct loop: if conversationContext exists, use it directly (already includes tool results)
  // Otherwise: build from scratch with conversationHistory
  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  if (conversationContext && conversationContext.length > 0) {
    // ReAct iteration: use full conversation context (includes tool calls + results)
    logger.info("Using conversation context for ReAct iteration", {
      contextLength: conversationContext.length,
    });
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }, // Original user message
      ...conversationContext.map(
        (msg): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
          // Type-safe mapping based on role
          if (msg.role === "tool") {
            return {
              role: "tool",
              content: msg.content || "",
              tool_call_id: msg.tool_call_id || "",
            };
          } else if (msg.role === "assistant") {
            return {
              role: "assistant",
              content: msg.content,
              tool_calls: msg.tool_calls,
            };
          } else if (msg.role === "user") {
            return {
              role: "user",
              content: msg.content || "",
            };
          } else {
            return {
              role: "system",
              content: msg.content || "",
            };
          }
        }
      ),
    ];
  } else {
    // First iteration: standard message building
    messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(
        (msg): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })
      ),
      { role: "user", content: userMessage },
    ];
  }

  // Retry with exponential backoff
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Calling OpenAI API (attempt ${attempt}/${maxRetries})`, {
        model: "gpt-4-turbo-preview",
        toolCount: tools.length,
        messageCount: messages.length,
      });

      const startTime = Date.now();
      const client = getOpenAIClient();

      const completion = await client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        tools,
        tool_choice: "auto",
        temperature,
        max_tokens: maxTokens,
      });

      const duration = Date.now() - startTime;

      logger.info("OpenAI API call successful", {
        duration,
        tokensUsed: completion.usage,
        finishReason: completion.choices[0].finish_reason,
      });

      const choice = completion.choices[0];
      const message = choice.message;

      // Extract tool calls
      const toolCalls: Array<{
        name: string;
        arguments: Record<string, unknown>;
      }> = [];

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          // Only process function type tool calls
          if (toolCall.type === "function") {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              toolCalls.push({
                name: toolCall.function.name,
                arguments: args,
              });
            } catch (parseError) {
              logger.error("Failed to parse tool call arguments", {
                toolName: toolCall.function.name,
                error: parseError,
              });
              throw new Error(
                `Invalid JSON in tool call arguments: ${toolCall.function.name}`
              );
            }
          }
        }
      }

      // Extract token usage
      const tokensUsed: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
      };

      return {
        message: message.content || "",
        toolCalls,
        tokensUsed,
      };
    } catch (error) {
      lastError = error as Error;

      logger.error(
        `OpenAI API call failed (attempt ${attempt}/${maxRetries})`,
        {
          error: lastError.message,
          errorType: lastError.constructor.name,
        }
      );

      // Check if it's a retryable error
      if (error instanceof OpenAI.APIError) {
        const apiError = error;

        // Don't retry on client errors (4xx)
        if (
          apiError.status &&
          apiError.status >= 400 &&
          apiError.status < 500
        ) {
          logger.error("OpenAI API client error (not retrying)", {
            status: apiError.status,
            message: apiError.message,
          });
          throw new Error(`OpenAI API error: ${apiError.message}`);
        }
      }

      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        logger.info(`Retrying after ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  logger.error("All OpenAI API retry attempts failed", {
    lastError: lastError?.message,
  });

  throw new Error(
    `OpenAI API failed after ${maxRetries} attempts: ${
      lastError?.message || "Unknown error"
    }`
  );
}

/**
 * Estimate token count for a string
 * Rough approximation: 1 token ≈ 4 characters
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if we have a valid OpenAI API key configured
 *
 * @returns True if API key is configured
 */
export function hasValidAPIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
