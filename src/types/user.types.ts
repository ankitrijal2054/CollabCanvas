// User types - to be implemented in PR #2
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
