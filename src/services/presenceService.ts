// Presence service - to be implemented in PR #7
import { database } from "./firebase";

export const presenceService = {
  updateCursorPosition: async (
    canvasId: string,
    userId: string,
    x: number,
    y: number
  ) => {
    // TODO: Implement cursor position update
    console.log("Update cursor:", canvasId, userId, x, y, database);
  },

  subscribeToCursors: (canvasId: string, callback: (cursors: any) => void) => {
    // TODO: Implement cursor subscription
    console.log("Subscribe to cursors:", canvasId, callback);
    return () => {};
  },

  setUserOnline: async (canvasId: string, userId: string, userData: any) => {
    // TODO: Implement set user online
    console.log("Set user online:", canvasId, userId, userData);
  },
};
