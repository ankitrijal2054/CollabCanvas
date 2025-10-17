// useKeyboardShortcuts - Global keyboard event listener for canvas shortcuts
import { useEffect } from "react";

/**
 * Platform detection utilities
 */
const isMac = () => {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  );
};

/**
 * Get the modifier key based on platform
 * @returns "metaKey" for Mac (Cmd), "ctrlKey" for Windows/Linux
 */
export const getModifierKey = (): "metaKey" | "ctrlKey" => {
  return isMac() ? "metaKey" : "ctrlKey";
};

/**
 * Get the modifier key display name based on platform
 * @returns "Cmd" for Mac, "Ctrl" for Windows/Linux
 */
export const getModifierKeyName = (): string => {
  return isMac() ? "Cmd" : "Ctrl";
};

/**
 * Keyboard shortcut handler functions interface
 * All handlers are optional
 */
export interface KeyboardShortcutHandlers {
  // Clipboard operations
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDuplicate?: () => void;

  // Object manipulation
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;

  // Nudge operations
  onNudgeUp?: () => void;
  onNudgeDown?: () => void;
  onNudgeLeft?: () => void;
  onNudgeRight?: () => void;
  onNudgeUpLarge?: () => void;
  onNudgeDownLarge?: () => void;
  onNudgeLeftLarge?: () => void;
  onNudgeRightLarge?: () => void;

  // Layer ordering
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;

  // Alignment (optional - for PR #20)
  onAlignLeft?: () => void;
  onAlignCenter?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignMiddle?: () => void;
  onAlignBottom?: () => void;

  // Help
  onHelp?: () => void;
}

/**
 * Hook options
 */
export interface UseKeyboardShortcutsOptions {
  enabled?: boolean; // Enable/disable shortcuts (default: true)
  handlers: KeyboardShortcutHandlers;
}

/**
 * useKeyboardShortcuts Hook
 * Listens for keyboard events and triggers appropriate handlers
 *
 * @param options - Configuration object with handlers and enabled flag
 */
export const useKeyboardShortcuts = ({
  enabled = true,
  handlers,
}: UseKeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const modifierKey = getModifierKey();
      const isModifier = event[modifierKey];
      const isShift = event.shiftKey;

      // Clipboard operations (Cmd/Ctrl + key)
      if (isModifier && !isShift) {
        switch (event.key.toLowerCase()) {
          case "c":
            event.preventDefault();
            handlers.onCopy?.();
            return;

          case "v":
            event.preventDefault();
            handlers.onPaste?.();
            return;

          case "x":
            event.preventDefault();
            handlers.onCut?.();
            return;

          case "d":
            event.preventDefault();
            handlers.onDuplicate?.();
            return;

          case "a":
            event.preventDefault();
            handlers.onSelectAll?.();
            return;

          case "[":
            event.preventDefault();
            handlers.onSendBackward?.();
            return;

          case "]":
            event.preventDefault();
            handlers.onBringForward?.();
            return;
        }
      }

      // Layer ordering with Alt (Cmd/Ctrl + Alt + key) - avoids browser tab switching shortcuts
      if (isModifier && event.altKey && !isShift) {
        switch (event.key) {
          case "“":
          case "[":
          case "{":
            event.preventDefault();
            handlers.onSendToBack?.();
            return;

          case "‘":
          case "]":
          case "}":
            event.preventDefault();
            handlers.onBringToFront?.();
            return;
        }
      }
      // Alignment shortcuts with Shift (Cmd/Ctrl + Shift + key)
      if (isModifier && event.altKey && !isShift) {
        switch (event.key.toLowerCase()) {
          // Alignment shortcuts (for PR #20)
          case "n":
          case "dead":
            event.preventDefault();
            handlers.onAlignLeft?.();
            return;

          case "m":
          case "µ":
            event.preventDefault();
            handlers.onAlignCenter?.();
            return;

          case ",":
          case "≤":
            event.preventDefault();
            handlers.onAlignRight?.();
            return;

          case ".":
          case "≥":
            event.preventDefault();
            handlers.onAlignTop?.();
            return;

          case ";":
          case "…":
            event.preventDefault();
            handlers.onAlignMiddle?.();
            return;

          case "/":
          case "÷":
            event.preventDefault();
            handlers.onAlignBottom?.();
            return;
        }
      }

      // Delete (Delete or Backspace)
      if (event.key === "Delete" || event.key === "Backspace") {
        // Only delete if not in a text input
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          event.preventDefault();
          handlers.onDelete?.();
          return;
        }
      }

      // Deselect (Escape)
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.onDeselect?.();
        return;
      }

      // Help (? key - Shift+/)
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        handlers.onHelp?.();
        return;
      }

      // Arrow key nudging
      if (event.key.startsWith("Arrow")) {
        // Don't prevent default if in input field
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
          return;
        }

        event.preventDefault();

        const isLargeNudge = isShift; // Shift + Arrow = 10px, otherwise 1px

        switch (event.key) {
          case "ArrowUp":
            if (isLargeNudge) {
              handlers.onNudgeUpLarge?.();
            } else {
              handlers.onNudgeUp?.();
            }
            return;

          case "ArrowDown":
            if (isLargeNudge) {
              handlers.onNudgeDownLarge?.();
            } else {
              handlers.onNudgeDown?.();
            }
            return;

          case "ArrowLeft":
            if (isLargeNudge) {
              handlers.onNudgeLeftLarge?.();
            } else {
              handlers.onNudgeLeft?.();
            }
            return;

          case "ArrowRight":
            if (isLargeNudge) {
              handlers.onNudgeRightLarge?.();
            } else {
              handlers.onNudgeRight?.();
            }
            return;
        }
      }
    };

    // Attach global keyboard listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handlers]);
};

/**
 * Utility: Get all keyboard shortcuts as a reference list
 * Useful for displaying in a help modal
 */
export const getKeyboardShortcuts = () => {
  const modKey = getModifierKeyName();

  return [
    // Clipboard
    {
      category: "Clipboard",
      keys: `${modKey}+C`,
      description: "Copy selected objects",
    },
    {
      category: "Clipboard",
      keys: `${modKey}+V`,
      description: "Paste objects",
    },
    {
      category: "Clipboard",
      keys: `${modKey}+X`,
      description: "Cut selected objects",
    },
    {
      category: "Clipboard",
      keys: `${modKey}+D`,
      description: "Duplicate selected objects",
    },

    // Selection
    {
      category: "Selection",
      keys: `${modKey}+A`,
      description: "Select all objects",
    },
    { category: "Selection", keys: "Escape", description: "Deselect all" },
    {
      category: "Selection",
      keys: "Delete / Backspace",
      description: "Delete selected objects",
    },

    // Movement
    {
      category: "Movement",
      keys: "Arrow Keys",
      description: "Nudge object 1px",
    },
    {
      category: "Movement",
      keys: "Shift+Arrow Keys",
      description: "Nudge object 10px",
    },

    // Layer Ordering
    {
      category: "Layer Order",
      keys: `${modKey}+]`,
      description: "Bring forward",
    },
    {
      category: "Layer Order",
      keys: `${modKey}+[`,
      description: "Send backward",
    },
    {
      category: "Layer Order",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+]`,
      description: "Bring to front",
    },
    {
      category: "Layer Order",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+[`,
      description: "Send to back",
    },

    // Alignment (Phase 2 PR #20)
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+N`,
      description: "Align left",
    },
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+M`,
      description: "Align horizontal center",
    },
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+<`,
      description: "Align right",
    },
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+>`,
      description: "Align top",
    },
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+:`,
      description: "Align vertical middle",
    },
    {
      category: "Alignment",
      keys: `${modKey}+${isMac() ? "Option" : "Alt"}+?`,
      description: "Align bottom",
    },

    // Help
    { category: "Help", keys: "?", description: "Show keyboard shortcuts" },
  ];
};
