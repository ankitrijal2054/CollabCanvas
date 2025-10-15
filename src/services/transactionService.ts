/**
 * Transaction Service
 *
 * Provides atomic Firebase operations to prevent race conditions.
 * - Prevents ghost objects (deleted object resurrection)
 * - Implements Last-Write-Wins conflict resolution
 * - Ensures atomic updates with validation
 */

import { ref, runTransaction } from "firebase/database";
import { database } from "./firebase";
import { DEFAULT_CANVAS_ID } from "../constants/canvas";
import type { CanvasObject } from "../types/canvas.types";

/**
 * Transaction error types for specific conflict scenarios
 */
export const TransactionErrorType = {
  OBJECT_DELETED: "OBJECT_DELETED",
  STALE_UPDATE: "STALE_UPDATE",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  OBJECT_EXISTS: "OBJECT_EXISTS",
  UNAUTHENTICATED: "UNAUTHENTICATED",
} as const;

export type TransactionErrorType =
  (typeof TransactionErrorType)[keyof typeof TransactionErrorType];

/**
 * Transaction result type
 */
export interface TransactionResult {
  success: boolean;
  error?: TransactionErrorType;
  errorMessage?: string;
  deletedBy?: string; // User ID who deleted the object (if applicable)
}

/**
 * Update a canvas object using Firebase transaction
 *
 * This ensures atomic updates with the following guarantees:
 * 1. Object exists before updating (prevents ghost objects)
 * 2. Update has newer timestamp than current state (Last-Write-Wins)
 * 3. All validations pass or transaction aborts
 *
 * @param objectId - ID of the object to update
 * @param updates - Partial updates to apply
 * @param userId - Optional user ID making the update (for attribution)
 * @returns Transaction result with success status and error details
 */
export async function updateObjectTransaction(
  objectId: string,
  updates: Partial<CanvasObject>,
  userId?: string
): Promise<TransactionResult> {
  const objectRef = ref(
    database,
    `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}`
  );

  try {
    const result = await runTransaction(objectRef, (currentData) => {
      // 1. Check if object exists
      if (currentData === null) {
        // Object was deleted - abort transaction
        return undefined; // Returning undefined aborts the transaction
      }

      // 2. Validate it's a proper object with required fields
      if (typeof currentData !== "object" || !currentData.id) {
        console.error("Invalid object data in transaction:", currentData);
        return undefined;
      }

      // 3. Last-Write-Wins: Check if update is newer than current state
      const currentTimestamp = currentData.timestamp || 0;
      const updateTimestamp = updates.timestamp || Date.now();

      if (updateTimestamp < currentTimestamp) {
        // Update is stale - abort transaction
        return undefined;
      }

      // 4. Apply the update atomically
      const updatedObject = {
        ...currentData,
        ...updates,
        timestamp: updateTimestamp,
      };

      // Add attribution if userId provided
      if (userId) {
        updatedObject.lastEditedBy = userId;
      }

      return updatedObject;
    });

    // Check if transaction was committed or aborted
    if (!result.committed) {
      // Transaction was aborted - need to determine why
      const snapshot = await result.snapshot.val();

      if (snapshot === null) {
        // Object doesn't exist anymore - it was deleted
        return {
          success: false,
          error: TransactionErrorType.OBJECT_DELETED,
          errorMessage: "Object was deleted by another user",
        };
      } else {
        // Transaction aborted due to stale update
        return {
          success: false,
          error: TransactionErrorType.STALE_UPDATE,
          errorMessage: "Update was overridden by a newer change",
        };
      }
    }

    // Transaction succeeded
    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Transaction failed:", error);

    // Check if it's a network error
    if (error.code === "PERMISSION_DENIED") {
      return {
        success: false,
        error: TransactionErrorType.TRANSACTION_FAILED,
        errorMessage: "Permission denied. Check Firebase rules.",
      };
    }

    // Generic network or Firebase error
    return {
      success: false,
      error: TransactionErrorType.NETWORK_ERROR,
      errorMessage: error.message || "Transaction failed due to network error",
    };
  }
}

/**
 * Delete a canvas object with validation
 *
 * This is a simpler operation but still uses transaction to ensure
 * the object exists before deletion (prevents double-delete errors)
 *
 * @param objectId - ID of the object to delete
 * @param userId - User ID performing the deletion
 * @returns Transaction result
 */
export async function deleteObjectTransaction(
  objectId: string,
  _userId: string
): Promise<TransactionResult> {
  const objectRef = ref(
    database,
    `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectId}`
  );

  try {
    const result = await runTransaction(objectRef, (currentData) => {
      // If object doesn't exist, abort (already deleted)
      if (currentData === null) {
        return undefined;
      }

      // Delete the object by returning null
      return null;
    });

    if (!result.committed) {
      // Object was already deleted
      return {
        success: false,
        error: TransactionErrorType.OBJECT_DELETED,
        errorMessage: "Object was already deleted",
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Delete transaction failed:", error);

    return {
      success: false,
      error: TransactionErrorType.TRANSACTION_FAILED,
      errorMessage: error.message || "Failed to delete object",
    };
  }
}

/**
 * Create a new canvas object with atomic validation
 *
 * Ensures the object ID doesn't already exist (prevents overwrites)
 *
 * @param objectData - Complete object data to create
 * @returns Transaction result
 */
export async function createObjectTransaction(
  objectData: CanvasObject
): Promise<TransactionResult> {
  const objectRef = ref(
    database,
    `/canvases/${DEFAULT_CANVAS_ID}/objects/${objectData.id}`
  );

  try {
    const result = await runTransaction(objectRef, (currentData) => {
      // If object already exists, abort (prevent overwrite)
      if (currentData !== null) {
        return undefined;
      }

      // Create the object
      return objectData;
    });

    if (!result.committed) {
      // Object already exists
      return {
        success: false,
        error: TransactionErrorType.TRANSACTION_FAILED,
        errorMessage: "Object with this ID already exists",
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Create transaction failed:", error);

    return {
      success: false,
      error: TransactionErrorType.TRANSACTION_FAILED,
      errorMessage: error.message || "Failed to create object",
    };
  }
}

/**
 * Utility to check if an error is recoverable
 *
 * @param errorType - Transaction error type
 * @returns True if the operation can be retried
 */
export function isRecoverableError(errorType: TransactionErrorType): boolean {
  return (
    errorType === TransactionErrorType.NETWORK_ERROR ||
    errorType === TransactionErrorType.STALE_UPDATE
  );
}

/**
 * Get user-friendly error message for UI display
 *
 * @param errorType - Transaction error type
 * @param objectType - Type of object (for context)
 * @returns User-friendly error message
 */
export function getErrorMessage(
  errorType: TransactionErrorType,
  objectType: string = "object"
): string {
  switch (errorType) {
    case TransactionErrorType.OBJECT_DELETED:
      return `This ${objectType} was deleted by another user`;
    case TransactionErrorType.STALE_UPDATE:
      return `Your changes were overridden by a newer edit`;
    case TransactionErrorType.NETWORK_ERROR:
      return `Network error. Please check your connection and try again`;
    case TransactionErrorType.TRANSACTION_FAILED:
      return `Failed to update ${objectType}. Please try again`;
    default:
      return `An error occurred. Please try again`;
  }
}
