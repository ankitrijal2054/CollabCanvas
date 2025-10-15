/**
 * Offline Operation Queue
 *
 * Manages queuing of canvas operations when offline.
 * - Persists operations to IndexedDB (5-10 minute window)
 * - Processes queue automatically on reconnection
 * - Implements exponential backoff retry logic
 * - Disables canvas after timeout exceeded
 */

import {
  type QueuedOperation,
  addOperation as addToIndexedDB,
  removeOperation as removeFromIndexedDB,
  getAllOperations,
  clearAllOperations,
  updateOperationRetryCount,
} from "./indexedDBManager";

export type OperationType = "create" | "update" | "delete";

export interface QueueConfig {
  maxOfflineDuration?: number; // milliseconds (default: 5 minutes)
  maxRetries?: number; // default: 3
  retryDelays?: number[]; // milliseconds for each retry attempt
}

export type OperationExecutor = (operation: QueuedOperation) => Promise<void>;

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private onTimeoutCallback?: () => void;
  private onQueueUpdateCallback?: (count: number) => void;
  private operationExecutor?: OperationExecutor;
  private onPauseSyncCallback?: () => void;
  private onResumeSyncCallback?: () => void;

  // Configuration with defaults
  private readonly MAX_OFFLINE_DURATION: number;
  private readonly MAX_RETRIES: number;
  private readonly RETRY_DELAYS: number[];

  constructor(config: QueueConfig = {}) {
    this.MAX_OFFLINE_DURATION = config.maxOfflineDuration || 5 * 60 * 1000; // 5 minutes
    this.MAX_RETRIES = config.maxRetries || 3;
    this.RETRY_DELAYS = config.retryDelays || [1000, 2000, 4000]; // Exponential backoff

    // Load existing operations from IndexedDB on initialization
    this.loadQueueFromIndexedDB();
  }

  /**
   * Set callback to trigger when timeout exceeded
   */
  public onTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  /**
   * Set callback to trigger when queue count updates
   */
  public onQueueUpdate(callback: (count: number) => void): void {
    this.onQueueUpdateCallback = callback;
  }

  /**
   * Set the executor function for processing operations
   * This will be provided by canvasService to execute Firebase operations
   */
  public setOperationExecutor(executor: OperationExecutor): void {
    this.operationExecutor = executor;
  }

  /**
   * Set callbacks to pause/resume real-time sync during queue processing
   * This prevents race conditions where Firebase updates overwrite local changes
   */
  public setSyncCallbacks(pauseSync: () => void, resumeSync: () => void): void {
    this.onPauseSyncCallback = pauseSync;
    this.onResumeSyncCallback = resumeSync;
  }

  /**
   * Load queue from IndexedDB on initialization
   */
  private async loadQueueFromIndexedDB(): Promise<void> {
    try {
      const operations = await getAllOperations();
      this.queue = operations;
      console.log(
        `OfflineQueue: Loaded ${operations.length} operations from IndexedDB`
      );

      // Notify queue update
      this.notifyQueueUpdate();

      // Check if timeout exceeded on load
      if (this.isTimeoutExceeded()) {
        console.warn("OfflineQueue: Timeout exceeded on initialization");
        this.triggerTimeout();
      }
    } catch (error) {
      console.error("OfflineQueue: Failed to load from IndexedDB", error);
    }
  }

  /**
   * Add operation to queue
   */
  public async enqueue(operation: QueuedOperation): Promise<void> {
    try {
      // Check if timeout exceeded before adding
      if (this.isTimeoutExceeded()) {
        console.warn("OfflineQueue: Cannot enqueue - timeout exceeded");
        this.triggerTimeout();
        return;
      }

      // Add to in-memory queue
      this.queue.push(operation);

      // Persist to IndexedDB
      await addToIndexedDB(operation);

      console.log(`OfflineQueue: Operation ${operation.id} enqueued`);

      // Notify queue update
      this.notifyQueueUpdate();

      // Attempt to process queue (if online)
      await this.processQueue();
    } catch (error) {
      console.error("OfflineQueue: Failed to enqueue operation", error);
      throw error;
    }
  }

  /**
   * Process all queued operations
   * Called automatically when back online
   */
  public async processQueue(): Promise<void> {
    // Don't process if already processing or offline
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    // Check if we have an executor
    if (!this.operationExecutor) {
      console.warn(
        "OfflineQueue: No operation executor set, cannot process queue"
      );
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    // Pause real-time sync to prevent race conditions
    if (this.onPauseSyncCallback) {
      this.onPauseSyncCallback();
    }

    this.isProcessing = true;
    console.log(`OfflineQueue: Processing ${this.queue.length} operations`);

    while (this.queue.length > 0) {
      const operation = this.queue[0];

      try {
        // Execute the operation
        await this.executeOperation(operation);

        // Success - remove from queue
        this.queue.shift();
        await removeFromIndexedDB(operation.id);

        console.log(
          `OfflineQueue: Operation ${operation.id} processed successfully`
        );

        // Notify queue update
        this.notifyQueueUpdate();
      } catch (error) {
        console.error(
          `OfflineQueue: Failed to process operation ${operation.id}`,
          error
        );

        if (this.isNetworkError(error)) {
          // Network error - stop processing and wait for reconnection
          console.log(
            "OfflineQueue: Network error detected, pausing queue processing"
          );
          break;
        }

        // Non-network error - handle retry logic
        if (operation.retryCount >= this.MAX_RETRIES) {
          // Max retries exceeded - remove and log failure
          console.error(
            `OfflineQueue: Operation ${operation.id} failed after ${this.MAX_RETRIES} retries`
          );
          this.handleFailedOperation(operation);
          this.queue.shift();
          await removeFromIndexedDB(operation.id);

          // Notify queue update
          this.notifyQueueUpdate();
        } else {
          // Increment retry count and wait before next attempt
          operation.retryCount++;
          await updateOperationRetryCount(operation.id, operation.retryCount);

          const delay =
            this.RETRY_DELAYS[operation.retryCount - 1] ||
            this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
          console.log(
            `OfflineQueue: Retrying operation ${operation.id} in ${delay}ms (attempt ${operation.retryCount}/${this.MAX_RETRIES})`
          );

          await this.delay(delay);
        }
      }
    }

    this.isProcessing = false;

    // Resume real-time sync after queue processing is complete
    if (this.onResumeSyncCallback) {
      this.onResumeSyncCallback();
    }

    // Log final queue status
    if (this.queue.length === 0) {
      console.log("OfflineQueue: All operations processed successfully ✅");
    } else {
      console.warn(
        `OfflineQueue: Processing stopped with ${this.queue.length} operations remaining ⚠️`
      );
      console.warn(
        "OfflineQueue: Remaining operations:",
        this.queue.map((op) => ({
          id: op.id,
          type: op.type,
          objectId: op.objectId,
          retryCount: op.retryCount,
        }))
      );
    }
  }

  /**
   * Execute a single operation using the provided executor
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    if (!this.operationExecutor) {
      throw new Error("No operation executor set");
    }

    return this.operationExecutor(operation);
  }

  /**
   * Check if oldest operation exceeds timeout window
   */
  public isTimeoutExceeded(): boolean {
    if (this.queue.length === 0) {
      return false;
    }

    const oldestOperation = this.queue[0];
    const age = Date.now() - oldestOperation.timestamp;

    return age > this.MAX_OFFLINE_DURATION;
  }

  /**
   * Trigger timeout callback (disable canvas)
   */
  private triggerTimeout(): void {
    if (this.onTimeoutCallback) {
      console.log("OfflineQueue: Triggering timeout callback");
      this.onTimeoutCallback();
    }
  }

  /**
   * Notify queue update callback
   */
  private notifyQueueUpdate(): void {
    if (this.onQueueUpdateCallback) {
      this.onQueueUpdateCallback(this.queue.length);
    }
  }

  /**
   * Handle failed operation (after max retries)
   */
  private handleFailedOperation(operation: QueuedOperation): void {
    // Log to console for debugging
    console.error("OfflineQueue: Failed operation details:", {
      id: operation.id,
      type: operation.type,
      objectId: operation.objectId,
      retries: operation.retryCount,
      timestamp: new Date(operation.timestamp).toISOString(),
    });

    // In production, you might want to send this to an error tracking service
    // or store in a separate "failed operations" log
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    // Check for common network error indicators
    if (!error) return false;

    const errorString = error.toString().toLowerCase();
    const errorCode = error.code?.toLowerCase() || "";

    return (
      errorString.includes("network") ||
      errorString.includes("offline") ||
      errorString.includes("fetch") ||
      errorCode.includes("unavailable") ||
      errorCode === "unavailable" ||
      !navigator.onLine
    );
  }

  /**
   * Utility: Delay for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queued operations
   */
  public getQueuedOperations(): QueuedOperation[] {
    return [...this.queue]; // Return copy to prevent external modification
  }

  /**
   * Get queue count
   */
  public getQueueCount(): number {
    return this.queue.length;
  }

  /**
   * Clear entire queue
   * Useful for manual reset or after successful reconnection
   */
  public async clearQueue(): Promise<void> {
    try {
      this.queue = [];
      await clearAllOperations();
      console.log("OfflineQueue: Queue cleared");

      // Notify queue update
      this.notifyQueueUpdate();
    } catch (error) {
      console.error("OfflineQueue: Failed to clear queue", error);
      throw error;
    }
  }

  /**
   * Get oldest operation timestamp (for timeout calculation)
   */
  public getOldestOperationTimestamp(): number | null {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue[0].timestamp;
  }

  /**
   * Get time remaining before timeout (in milliseconds)
   * Returns null if queue is empty, negative if timeout exceeded
   */
  public getTimeUntilTimeout(): number | null {
    const oldestTimestamp = this.getOldestOperationTimestamp();
    if (oldestTimestamp === null) {
      return null;
    }

    const age = Date.now() - oldestTimestamp;
    return this.MAX_OFFLINE_DURATION - age;
  }
}

// Export singleton instance for global use
export const offlineQueue = new OfflineQueue();
