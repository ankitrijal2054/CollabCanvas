/**
 * Chat Message Component - Individual message in AI chat
 *
 * PR #27: Enhanced error messages with suggestions
 */

import type { AIMessage } from "../../types/ai.types";
import "./ChatMessage.css";

interface ChatMessageProps {
  message: AIMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  /**
   * Format message content (support markdown-like formatting and newlines)
   */
  const formatContent = (content: string): string => {
    // Simple markdown support: **bold**, *italic*, `code`
    return content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br />");
  };

  /**
   * Parse error message to extract main message and suggestions
   * PR #27: Extract suggestions from error messages
   */
  const parseErrorMessage = (
    error: string
  ): { message: string; suggestions: string[] } => {
    const parts = error.split("\n\nSuggestions:\n");
    if (parts.length === 2) {
      const suggestions = parts[1]
        .split("\n")
        .filter((line) => line.startsWith("•"))
        .map((line) => line.replace(/^•\s*/, "").trim());
      return {
        message: parts[0],
        suggestions,
      };
    }
    return {
      message: error,
      suggestions: [],
    };
  };

  /**
   * Get error display info
   */
  const errorInfo =
    isError && message.error ? parseErrorMessage(message.error) : null;

  return (
    <div
      className={`chat-message ${isUser ? "user" : "assistant"} ${
        isError ? "error" : ""
      }`}
    >
      <div className="message-avatar">{isUser ? "👤" : "🤖"}</div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        <div
          className="message-text"
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        {isError && errorInfo && (
          <div className="message-error-box">
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">Error</span>
            </div>
            <div className="error-message">{errorInfo.message}</div>
            {errorInfo.suggestions.length > 0 && (
              <div className="error-suggestions">
                <div className="suggestions-title">Try:</div>
                <ul className="suggestions-list">
                  {errorInfo.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="message-tools">
            <span className="tools-label">
              Executed {message.toolCalls.length} operation(s)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
