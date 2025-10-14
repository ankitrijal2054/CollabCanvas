// User types for authentication and user management

/**
 * User interface representing an authenticated user
 * Matches Firebase Auth user structure with additional app-specific fields
 */
export interface User {
  id: string; // Firebase UID
  name: string; // Display name
  email: string; // User email
  photoURL?: string; // Optional profile photo (from Google Sign-In)
}

/**
 * AuthState interface for managing authentication state in context
 */
export interface AuthState {
  user: User | null; // Current authenticated user or null if not logged in
  loading: boolean; // True when auth operations are in progress
  error: string | null; // Error message if auth operation failed
}

/**
 * Signup form data interface
 */
export interface SignupData {
  name: string;
  email: string;
  password: string;
}

/**
 * Login form data interface
 */
export interface LoginData {
  email: string;
  password: string;
}
