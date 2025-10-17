/**
 * AI Chat Panel - Right sidebar chat interface for AI commands
 */

import { useState, useRef, useEffect } from "react";
import { useAI } from "../../contexts/AIContext";
import ChatMessage from "./ChatMessage";
import CommandSuggestions from "./CommandSuggestions";
import "./AIChatPanel.css";

export default function AIChatPanel() {
  const {
    messages,
    isProcessing,
    sendCommand,
    clearHistory,
    getQueueStatus,
    setIsAIPanelOpen,
  } = useAI();

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Handle send command
   */
  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message) return;

    // Clear input immediately
    setInputValue("");

    // Send command
    await sendCommand(message);
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (Shift+Enter for newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  /**
   * Get queue status message
   */
  const queueStatus = getQueueStatus();
  const queueMessage =
    queueStatus.position !== null && queueStatus.position > 0
      ? `${queueStatus.position} command(s) ahead of you`
      : null;

  return (
    <div className="ai-chat-panel expanded">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="header-title">
          <span className="ai-icon">⚡</span>
          <h3>AI Assistant</h3>
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <button
              className="clear-button"
              onClick={clearHistory}
              title="Clear history"
            >
              <span>🗑️</span>
            </button>
          )}
          <button
            className="close-button"
            onClick={() => setIsAIPanelOpen(false)}
            title="Close AI Assistant"
          >
            <span>✕</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ai-chat-content">
        <>
          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💡</div>
                <h4>AI-Powered Design Assistant</h4>
                <p>
                  Describe what you want to create and I'll help you build it.
                  Try one of the suggestions below!
                </p>
                <CommandSuggestions onSuggestionClick={handleSuggestionClick} />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {/* Loading indicator */}
                {isProcessing && (
                  <div className="loading-message">
                    <div className="loading-avatar">🤖</div>
                    <div className="loading-content">
                      <div className="loading-dots">
                        <span>AI is thinking</span>
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                      </div>
                      {queueMessage && (
                        <div className="queue-status">{queueMessage}</div>
                      )}
                    </div>
                  </div>
                )}
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="ai-chat-input">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your command... (Enter to send, Shift+Enter for newline)"
              disabled={isProcessing}
              maxLength={1000}
              rows={2}
            />
            <div className="input-footer">
              <div className="char-count">{inputValue.length} / 1000</div>
              <button
                className="send-button"
                onClick={handleSend}
                disabled={!inputValue.trim() || isProcessing}
              >
                <span>→</span>
              </button>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
