/**
 * AI Service - Client-side API for AI command processing
 *
 * Handles communication with Firebase Cloud Functions AI endpoint
 */

import type { AICommand, AIResponse, AIError } from "../types/ai.types";

/**
 * Base URL for Firebase Cloud Functions
 * Must be set via environment variables
 */
const getFirebaseFunctionsURL = (): string => {
  const functionsURL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;

  if (!functionsURL) {
    throw new Error(
      "VITE_FIREBASE_FUNCTIONS_URL environment variable is not set. " +
        "Please configure it in your .env file."
    );
  }

  return functionsURL;
};

const FUNCTIONS_URL = getFirebaseFunctionsURL();
const AI_CHAT_ENDPOINT = `${FUNCTIONS_URL}/aichat`;

/**
 * Maximum retry attempts for failed requests
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff (milliseconds)
 */
const BASE_RETRY_DELAY = 1000;

/**
 * Check if response is an error
 */
function isAIError(response: AIResponse): response is AIError {
  return response.success === false;
}

/**
 * Exponential backoff delay calculation
 */
function calculateRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * Delay helper for retries
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send AI command to server
 *
 * @param command - The AI command request
 * @param idToken - Firebase ID token for authentication
 * @returns Promise resolving to AI response
 * @throws Error if all retry attempts fail
 */
export async function sendAICommand(
  command: AICommand,
  idToken: string
): Promise<AIResponse> {
  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(AI_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(command),
      });

      // Parse response
      const data = (await response.json()) as AIResponse;

      // If response is not ok but we got JSON, it's likely an AI error
      if (!response.ok) {
        console.warn("[AI Service] API returned error", {
          status: response.status,
          error: data,
        });

        // If it's a structured AI error, return it
        if (isAIError(data)) {
          return data;
        }

        // Otherwise throw to trigger retry
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Success
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.warn(`[AI Service] Attempt ${attempt + 1} failed`, {
        error: lastError.message,
      });

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const retryDelay = calculateRetryDelay(attempt);
        console.warn(`[AI Service] Retrying in ${retryDelay}ms...`);
        await delay(retryDelay);
      }
    }
  }

  // All retries exhausted
  console.error("[AI Service] All retry attempts failed", {
    error: lastError?.message,
  });

  // Return a network error response
  const errorResponse: AIError = {
    success: false,
    error: "NETWORK_ERROR",
    message: `Failed to connect to AI service after ${MAX_RETRIES} attempts. Please check your connection and try again.`,
    suggestions: [
      "Check your internet connection",
      "Try again in a moment",
      "If the problem persists, contact support",
    ],
  };

  return errorResponse;
}

/**
 * Validate AI command before sending
 *
 * @param command - The AI command to validate
 * @returns Error message if invalid, null if valid
 */
export function validateAICommand(command: AICommand): string | null {
  if (!command.message || command.message.trim().length === 0) {
    return "Message cannot be empty";
  }

  if (command.message.length > 1000) {
    return "Message is too long (maximum 1000 characters)";
  }

  if (!command.canvasId) {
    return "Canvas ID is required";
  }

  if (!command.userId) {
    return "User ID is required";
  }

  return null;
}

/**
 * Format error message for display
 *
 * @param error - AI error response
 * @returns User-friendly error message
 */
export function formatErrorMessage(error: AIError): string {
  let message = error.message;

  // Add suggestions if available
  if (error.suggestions && error.suggestions.length > 0) {
    message += "\n\nSuggestions:\n";
    message += error.suggestions.map((s) => `• ${s}`).join("\n");
  }

  return message;
}
