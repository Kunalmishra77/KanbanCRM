import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { authAPI, setCurrentUserId } from "./api";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
};

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem("agentix_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setCurrentUserId(parsedUser.id);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser } = await authAPI.login(email);
      
      setUser(loggedInUser);
      setCurrentUserId(loggedInUser.id);
      localStorage.setItem("agentix_user", JSON.stringify(loggedInUser));
      
      toast({
        title: "Welcome back",
        description: `Signed in as ${loggedInUser.name}`,
      });
      
      setLocation("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Simulate Google OAuth - in production this would redirect to Google
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { user: loggedInUser } = await authAPI.login('alex@agentix.com');
      
      setUser(loggedInUser);
      setCurrentUserId(loggedInUser.id);
      localStorage.setItem("agentix_user", JSON.stringify(loggedInUser));
      
      toast({
        title: "Signed in with Google",
        description: `Welcome back, ${loggedInUser.name}`,
      });
      
      setLocation("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCurrentUserId(null);
    localStorage.removeItem("agentix_user");
    setLocation("/auth");
    toast({
      title: "Signed out",
      description: "See you next time!",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, isLoading }}>
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
