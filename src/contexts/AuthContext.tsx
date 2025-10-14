// AuthContext - Manages authentication state globally
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  User,
  AuthState,
  SignupData,
  LoginData,
} from "../types/user.types";
import { authService } from "../services/authService";

/**
 * Auth Context Interface
 * Defines all auth-related methods and state available to components
 */
interface AuthContextType extends AuthState {
  signUp: (data: SignupData) => Promise<void>;
  signIn: (data: LoginData) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * Wraps the app and provides authentication state and methods to all children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true, // Start as true to check for existing session
    error: null,
  });

  /**
   * Listen for authentication state changes
   * This runs once on mount and sets up a listener
   */
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  /**
   * Sign up a new user
   */
  const signUp = async (data: SignupData): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await authService.signUp(
        data.email,
        data.password,
        data.name
      );
      setAuthState({ user, loading: false, error: null });
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error; // Re-throw so the component can handle it
    }
  };

  /**
   * Sign in an existing user
   */
  const signIn = async (data: LoginData): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await authService.signIn(data.email, data.password);
      setAuthState({ user, loading: false, error: null });
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await authService.signInWithGoogle();
      setAuthState({ user, loading: false, error: null });
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      await authService.signOut();
      setAuthState({ user: null, loading: false, error: null });
    } catch (error: any) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const value: AuthContextType = {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to use the Auth context
 * Throws an error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
