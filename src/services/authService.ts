// Authentication service with Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, database } from "./firebase";
import type { User } from "../types/user.types";

/**
 * Convert Firebase User to our app's User interface
 */
const mapFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || "Anonymous",
    email: firebaseUser.email || "",
    photoURL: firebaseUser.photoURL || undefined,
  };
};

/**
 * Save user profile to Realtime Database
 * This allows other users to see names in presence/collaboration features
 */
const saveUserProfile = async (user: User): Promise<void> => {
  const userRef = ref(database, `users/${user.id}`);
  await set(userRef, {
    name: user.name,
    email: user.email,
    photoURL: user.photoURL || null,
  });
};

/**
 * Authentication service for Firebase Auth operations
 */
export const authService = {
  /**
   * Sign up a new user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @param name - User's display name
   * @returns User object
   */
  signUp: async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Force reload to get updated profile
      await userCredential.user.reload();
      const updatedUser = auth.currentUser;

      if (!updatedUser) {
        throw new Error("Failed to get updated user");
      }

      const user = mapFirebaseUser(updatedUser);

      // Save user profile to database for collaboration features
      await saveUserProfile(user);

      return user;
    } catch (error: any) {
      // Firebase error handling
      if (error.code === "auth/email-already-in-use") {
        throw new Error("This email is already registered");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Password should be at least 6 characters");
      } else {
        throw new Error(error.message || "Failed to sign up");
      }
    }
  },

  /**
   * Sign in an existing user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns User object
   */
  signIn: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = mapFirebaseUser(userCredential.user);

      // Update user profile in database (in case name changed)
      await saveUserProfile(user);

      return user;
    } catch (error: any) {
      // Firebase error handling
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email");
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address");
      } else if (error.code === "auth/invalid-credential") {
        throw new Error("Invalid email or password");
      } else {
        throw new Error(error.message || "Failed to sign in");
      }
    }
  },

  /**
   * Sign in with Google
   * Opens a popup for Google authentication
   * @returns User object
   */
  signInWithGoogle: async (): Promise<User> => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = mapFirebaseUser(userCredential.user);

      // Save user profile to database
      await saveUserProfile(user);

      return user;
    } catch (error: any) {
      // Firebase error handling
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed");
      } else if (error.code === "auth/cancelled-popup-request") {
        throw new Error("Sign-in was cancelled");
      } else {
        throw new Error(error.message || "Failed to sign in with Google");
      }
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign out");
    }
  },

  /**
   * Get the currently authenticated user
   * @returns User object or null if not authenticated
   */
  getCurrentUser: (): User | null => {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
  },

  /**
   * Get the Firebase ID token for the current user
   * @returns ID token string or null if not authenticated
   */
  getIdToken: async (): Promise<string | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return null;
    }
    return await firebaseUser.getIdToken();
  },

  /**
   * Listen for authentication state changes
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    return auth.onAuthStateChanged((firebaseUser) => {
      callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
    });
  },
};
