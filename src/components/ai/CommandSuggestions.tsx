/**
 * Command Suggestions Component
 *
 * Displays clickable command examples to help users discover AI capabilities
 */

import "./CommandSuggestions.css";

interface CommandSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

/**
 * Predefined command suggestions
 */
const SUGGESTIONS = [
  {
    icon: "🔴",
    text: "Create a red circle at 100, 200",
    category: "Simple Creation",
  },
  {
    icon: "📝",
    text: "Build a login form",
    category: "Complex Layout",
  },
  {
    icon: "📐",
    text: "Arrange selected shapes horizontally",
    category: "Layout",
  },
  {
    icon: "⊞",
    text: "Create a 3x3 grid of squares",
    category: "Grid",
  },
  {
    icon: "🎨",
    text: "Change the blue rectangle to green",
    category: "Styling",
  },
  {
    icon: "📊",
    text: "Make a navigation bar with 4 menu items",
    category: "Complex Layout",
  },
  {
    icon: "⇋",
    text: "Align all circles to the left",
    category: "Alignment",
  },
  {
    icon: "📄",
    text: "Create a card layout with title and description",
    category: "Complex Layout",
  },
];

export default function CommandSuggestions({
  onSuggestionClick,
}: CommandSuggestionsProps) {
  return (
    <div className="command-suggestions">
      <div className="suggestions-grid">
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            className="suggestion-card"
            onClick={() => onSuggestionClick(suggestion.text)}
            title={suggestion.category}
          >
            <span className="suggestion-icon">{suggestion.icon}</span>
            <span className="suggestion-text">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
