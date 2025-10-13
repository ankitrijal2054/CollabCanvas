// Authentication service - to be implemented in PR #2
import { auth } from "./firebase";

export const authService = {
  signUp: async (email: string, password: string, name: string) => {
    // TODO: Implement sign up
    console.log("Sign up:", email, password, name, auth);
  },

  signIn: async (email: string, password: string) => {
    // TODO: Implement sign in
    console.log("Sign in:", email, password);
  },

  signInWithGoogle: async () => {
    // TODO: Implement Google sign in
    console.log("Sign in with Google");
  },

  signOut: async () => {
    // TODO: Implement sign out
    console.log("Sign out");
  },

  getCurrentUser: () => {
    // TODO: Get current user
    return null;
  },
};
