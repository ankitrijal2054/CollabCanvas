/**
 * Tool Parameter Validator
 *
 * Validates tool calls and their parameters using Zod schemas.
 * Provides detailed error messages for validation failures.
 */

import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { toolSchemaMap } from "../schemas/toolSchemas";
import type { ToolCall } from "../types/ai.types";

/**
 * Validation result (success)
 */
export interface ValidationSuccess {
  success: true;
  toolCall: ToolCall;
}

/**
 * Validation result (error)
 */
export interface ValidationError {
  success: false;
  toolName: string;
  errors: string[];
}

/**
 * Validation result type
 */
export type ValidationResult = ValidationSuccess | ValidationError;

/**
 * Validate a single tool call using its Zod schema
 *
 * @param toolName - Name of the tool
 * @param parameters - Tool parameters to validate
 * @returns Validation result (success or error with details)
 */
export function validateToolCall(
  toolName: string,
  parameters: Record<string, unknown>
): ValidationResult {
  logger.info("Validating tool call", { toolName, parameters });

  // Check if tool exists
  if (!(toolName in toolSchemaMap)) {
    logger.error("Unknown tool name", { toolName });
    return {
      success: false,
      toolName,
      errors: [`Unknown tool: ${toolName}`],
    };
  }

  // Get the schema for this tool
  const schema = toolSchemaMap[toolName as keyof typeof toolSchemaMap];

  try {
    // Validate and parse parameters
    const validatedParams = schema.parse(parameters);

    logger.info("Tool call validation successful", { toolName });

    return {
      success: true,
      toolCall: {
        tool: toolName,
        parameters: validatedParams as Record<string, unknown>,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract error messages
      const errors = error.issues.map((err) => {
        const path = err.path.join(".");
        return `${path}: ${err.message}`;
      });

      logger.warn("Tool call validation failed", {
        toolName,
        errors,
      });

      return {
        success: false,
        toolName,
        errors,
      };
    }

    // Unexpected error
    logger.error("Unexpected validation error", {
      toolName,
      error,
    });

    return {
      success: false,
      toolName,
      errors: ["Unexpected validation error"],
    };
  }
}

/**
 * Validate multiple tool calls
 *
 * @param toolCalls - Array of tool calls to validate
 * @returns Object with validated tool calls and any errors
 */
export function validateToolCalls(
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>
): {
  validatedCalls: ToolCall[];
  errors: ValidationError[];
} {
  const validatedCalls: ToolCall[] = [];
  const errors: ValidationError[] = [];

  for (const toolCall of toolCalls) {
    const result = validateToolCall(toolCall.name, toolCall.arguments);

    if (result.success) {
      validatedCalls.push(result.toolCall);
    } else {
      errors.push(result);
    }
  }

  logger.info("Batch validation complete", {
    totalCalls: toolCalls.length,
    validCalls: validatedCalls.length,
    errorCount: errors.length,
  });

  return {
    validatedCalls,
    errors,
  };
}

/**
 * Format validation errors into a user-friendly message
 *
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return "";
  }

  if (errors.length === 1) {
    const error = errors[0];
    return `Validation error in ${error.toolName}: ${error.errors.join(", ")}`;
  }

  let message = `Validation errors found in ${errors.length} tool calls:\n`;
  for (const error of errors) {
    message += `- ${error.toolName}: ${error.errors.join(", ")}\n`;
  }

  return message.trim();
}

/**
 * Check if shape ID exists in canvas state
 * (To be called after fetching canvas state)
 *
 * @param shapeId - Shape ID to check
 * @param existingIds - Set of existing shape IDs
 * @returns True if shape exists
 */
export function validateShapeExists(
  shapeId: string,
  existingIds: Set<string>
): boolean {
  return existingIds.has(shapeId);
}

/**
 * Validate shape ID references in tool calls
 *
 * @param toolCalls - Tool calls to validate
 * @param existingIds - Set of existing shape IDs
 * @returns Array of errors (empty if all valid)
 */
export function validateShapeReferences(
  toolCalls: ToolCall[],
  existingIds: Set<string>
): string[] {
  const errors: string[] = [];

  for (const toolCall of toolCalls) {
    const { tool, parameters } = toolCall;

    // Check single shape ID
    if ("shapeId" in parameters && typeof parameters.shapeId === "string") {
      if (!validateShapeExists(parameters.shapeId, existingIds)) {
        errors.push(`${tool}: Shape ID "${parameters.shapeId}" does not exist`);
      }
    }

    // Check array of shape IDs
    if ("shapeIds" in parameters && Array.isArray(parameters.shapeIds)) {
      const invalidIds = parameters.shapeIds.filter(
        (id) => !validateShapeExists(id, existingIds)
      );
      if (invalidIds.length > 0) {
        errors.push(
          `${tool}: Shape IDs do not exist: ${invalidIds.join(", ")}`
        );
      }
    }
  }

  return errors;
}
