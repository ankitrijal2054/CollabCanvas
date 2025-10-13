// AuthGuard component - to be implemented in PR #2
import type { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>;
}
