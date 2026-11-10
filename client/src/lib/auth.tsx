import { perms, roleOf } from "@shared/roles";
import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type User = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role: string;
  userType?: string | null;
  shareholdingPercent?: string | null;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/auth";
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: user || null, 
      isLoading, 
      isAuthenticated: !!user,
      login,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Role helpers. Rules live in shared/roles.ts so the server and the UI always agree.
export function useRole() {
  const { user } = useAuth();
  return roleOf(user);
}
export function useIsFounder() {
  return perms.isFounder(useAuth().user);
}
export function useCanViewFinance() {
  return perms.viewFinance(useAuth().user);
}
export function useCanViewPayroll() {
  return perms.viewPayroll(useAuth().user);
}
export function useCanManageTeam() {
  return perms.manageTeam(useAuth().user);
}
export function useCanApproveRequests() {
  return perms.approveRequests(useAuth().user);
}
export function useCanViewOverview() {
  return perms.viewOverview(useAuth().user);
}
export function useCanViewTeamStats() {
  return perms.viewTeamStats(useAuth().user);
}
