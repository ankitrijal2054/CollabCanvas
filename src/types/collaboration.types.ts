// Collaboration types for real-time multiplayer features

/**
 * 2D cursor position in canvas coordinates
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * User presence data stored in Firebase
 * Path: /presence/{canvasId}/{userId}
 */
export interface UserPresence {
  name: string; // Display name
  online: boolean; // Online status
  cursor?: CursorPosition; // Optional cursor position (undefined when not on canvas)
  lastSeen: number; // Last activity timestamp
}

/**
 * Extended user presence with computed fields for UI
 * Includes userId and color which aren't stored in Firebase
 */
export interface UserPresenceExtended extends UserPresence {
  userId: string; // Firebase user ID
  color: string; // Generated color for this user
}

/**
 * Presence state map
 * Key: userId, Value: UserPresenceExtended
 */
export type PresenceMap = Record<string, UserPresenceExtended>;

/**
 * Cursor data for rendering
 * Combines position with user info
 */
export interface CursorData {
  userId: string;
  name: string;
  position: CursorPosition;
  color: string;
}

/**
 * Presence update payload for Firebase writes
 */
export interface PresenceUpdate {
  name?: string;
  online?: boolean;
  cursor?: CursorPosition | null;
  lastSeen?: number;
}

/**
 * Online users list for sidebar display
 */
export interface OnlineUser {
  userId: string;
  name: string;
  color: string;
  lastSeen: number;
}

/**
 * Live transform snapshot for "ghost" previews during drag/resize/rotate
 * Stored transiently under presence path: /presence/{canvasId}/{userId}/transforms/{objectId}
 */
export interface TransformSnapshot {
  objectId: string;
  type: "rectangle" | "circle" | "star" | "line" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // Minimal styling for faithful ghost rendering
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  zIndex?: number;
  // Text-specific (optional)
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  lastUpdated: number;
}

/**
 * Remote transforms map
 * - Keyed by userId, then by objectId → TransformSnapshot
 */
export type UserTransforms = Record<string, TransformSnapshot>;
export type RemoteTransformsMap = Record<string, UserTransforms>;

/**
 * Presence service configuration
 */
export interface PresenceConfig {
  canvasId: string;
  userId: string;
  userName: string;
  throttleMs?: number; // Cursor update throttle (default: 16ms = 60fps)
}

/**
 * Cursor style options
 */
export interface CursorStyle {
  size?: number; // Cursor icon size (default: 20px)
  labelOffset?: number; // Distance of label from cursor (default: 24px)
  labelPadding?: number; // Label padding (default: 6px)
  fontSize?: number; // Label font size (default: 12px)
}
