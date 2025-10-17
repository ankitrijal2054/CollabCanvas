/**
 * Chat Message Component - Individual message in AI chat
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
   * Format message content (support markdown-like formatting)
   */
  const formatContent = (content: string): string => {
    // Simple markdown support: **bold**, *italic*, `code`
    return content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  };

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
        {isError && message.error && (
          <div className="message-error">
            <span className="error-icon">⚠️</span>
            <span>{message.error}</span>
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
