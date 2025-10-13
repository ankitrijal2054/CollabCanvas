// Collaboration types - to be implemented in PR #7
export interface CursorPosition {
  x: number;
  y: number;
}

export interface UserPresence {
  userId: string;
  name: string;
  online: boolean;
  cursor: CursorPosition | null;
  lastSeen: number;
  color?: string;
}
