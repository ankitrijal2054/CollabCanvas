/**
 * AI Command Queue - Per-canvas FIFO queue for AI commands
 *
 * Prevents conflicts when multiple users issue AI commands simultaneously
 */

import type { QueuedAICommand } from "../types/ai.types";

/**
 * Maximum queue size (prevent infinite growth)
 */
const MAX_QUEUE_SIZE = 5;

/**
 * Command timeout (milliseconds) - after this, command can be cancelled
 */
const COMMAND_TIMEOUT = 30000; // 30 seconds

/**
 * AI Command Queue class
 *
 * Manages a FIFO queue of AI commands for a specific canvas
 */
export class AICommandQueue {
  private queue: QueuedAICommand[] = [];
  private isProcessing: boolean = false;
  private readonly canvasId: string;
  private onStatusChange?: (
    queue: QueuedAICommand[],
    current: QueuedAICommand | null
  ) => void;

  constructor(
    canvasId: string,
    onStatusChange?: (
      queue: QueuedAICommand[],
      current: QueuedAICommand | null
    ) => void
  ) {
    this.canvasId = canvasId;
    this.onStatusChange = onStatusChange;
    console.log(`[AI Queue] Initialized for canvas: ${this.canvasId}`);
  }

  /**
   * Enqueue a new command
   *
   * @param command - The command to enqueue
   * @throws Error if queue is full
   */
  enqueue(command: QueuedAICommand): void {
    // Check queue size
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error(
        `Command queue is full (maximum ${MAX_QUEUE_SIZE} commands). Please wait for commands to complete.`
      );
    }

    console.log("[AI Queue] Enqueuing command", {
      commandId: command.id,
      queuePosition: this.queue.length,
      message: command.message.substring(0, 50),
    });

    // Set initial status
    command.status = "pending";
    command.timestamp = Date.now();
    command.retryCount = 0;

    // Add to queue
    this.queue.push(command);

    // Notify listeners
    this.notifyStatusChange();

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the queue (async, runs continuously)
   */
  private async processQueue(): Promise<void> {
    // If already processing or queue is empty, return
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const command = this.queue[0];

        console.log("[AI Queue] Processing command", {
          commandId: command.id,
          remainingInQueue: this.queue.length - 1,
        });

        // Update status to processing
        command.status = "processing";
        this.notifyStatusChange();

        // Check for timeout
        const elapsed = Date.now() - command.timestamp;
        if (elapsed > COMMAND_TIMEOUT) {
          console.warn("[AI Queue] Command timeout", {
            commandId: command.id,
            elapsed,
          });

          command.status = "error";
          command.error = {
            success: false,
            error: "TIMEOUT",
            message:
              "Command took too long to process. Please try a simpler command.",
          };

          this.queue.shift();
          this.notifyStatusChange();
          continue;
        }

        // Command will be executed by the consumer (AIContext)
        // We just mark it as processing and wait for completion
        // The actual execution happens outside this queue

        // Wait for the command to be processed
        // This is a blocking wait - the consumer must call completeCommand() or failCommand()
        await this.waitForCommandCompletion(command.id);

        // Remove from queue
        this.queue.shift();
        this.notifyStatusChange();
      }
    } finally {
      this.isProcessing = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Wait for a command to complete
   *
   * @param commandId - The command ID to wait for
   * @returns Promise that resolves when command completes
   */
  private waitForCommandCompletion(commandId: string): Promise<void> {
    return new Promise((resolve) => {
      // Check every 100ms if the command is no longer processing
      const checkInterval = setInterval(() => {
        const command = this.queue[0];

        if (!command || command.id !== commandId) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        if (command.status !== "processing") {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after COMMAND_TIMEOUT
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, COMMAND_TIMEOUT);
    });
  }

  /**
   * Mark current command as complete
   *
   * @param commandId - The command ID
   * @param response - The AI response
   */
  completeCommand(commandId: string, response: any): void {
    const command = this.queue[0];

    if (!command || command.id !== commandId) {
      console.warn("[AI Queue] Attempted to complete non-current command", {
        commandId,
        currentCommandId: command?.id,
      });
      return;
    }

    console.log("[AI Queue] Command completed", {
      commandId,
      executionTime: response.executionTime,
    });

    command.status = "completed";
    command.response = response;
    this.notifyStatusChange();

    // Continue processing (will remove this command and move to next)
    this.processQueue();
  }

  /**
   * Mark current command as failed
   *
   * @param commandId - The command ID
   * @param error - The error
   */
  failCommand(commandId: string, error: any): void {
    const command = this.queue[0];

    if (!command || command.id !== commandId) {
      console.warn("[AI Queue] Attempted to fail non-current command", {
        commandId,
        currentCommandId: command?.id,
      });
      return;
    }

    console.error("[AI Queue] Command failed", {
      commandId,
      error: error.message || error,
    });

    command.status = "error";
    command.error = error;
    this.notifyStatusChange();

    // Continue processing (will remove this command and move to next)
    this.processQueue();
  }

  /**
   * Cancel a pending command
   *
   * @param commandId - The command ID to cancel
   * @returns true if cancelled, false if not found or already processing
   */
  cancelCommand(commandId: string): boolean {
    const index = this.queue.findIndex((cmd) => cmd.id === commandId);

    if (index === -1) {
      return false;
    }

    const command = this.queue[index];

    // Can only cancel pending commands
    if (command.status !== "pending") {
      return false;
    }

    console.log("[AI Queue] Cancelling command", {
      commandId,
      position: index,
    });

    command.status = "cancelled";
    this.queue.splice(index, 1);
    this.notifyStatusChange();

    return true;
  }

  /**
   * Get current queue status
   */
  getStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentCommand: QueuedAICommand | null;
    pendingCommands: QueuedAICommand[];
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentCommand:
        this.isProcessing && this.queue.length > 0 ? this.queue[0] : null,
      pendingCommands: this.queue.filter((cmd) => cmd.status === "pending"),
    };
  }

  /**
   * Get position of a command in queue
   *
   * @param commandId - The command ID
   * @returns Position (0-indexed), or -1 if not found
   */
  getCommandPosition(commandId: string): number {
    return this.queue.findIndex((cmd) => cmd.id === commandId);
  }

  /**
   * Clear all pending commands (emergency stop)
   */
  clear(): void {
    console.log("[AI Queue] Clearing queue", {
      queueLength: this.queue.length,
    });

    this.queue = [];
    this.isProcessing = false;
    this.notifyStatusChange();
  }

  /**
   * Notify listeners of status change
   */
  private notifyStatusChange(): void {
    if (this.onStatusChange) {
      const currentCommand =
        this.isProcessing && this.queue.length > 0 ? this.queue[0] : null;
      this.onStatusChange([...this.queue], currentCommand);
    }
  }
}

/**
 * Generate unique command ID
 */
export function generateCommandId(): string {
  return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
