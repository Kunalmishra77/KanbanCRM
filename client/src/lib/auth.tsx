import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { USERS, User } from "./mockData";
import { useToast } from "@/hooks/use-toast";

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
    // Simulate checking local storage or session on mount
    const storedUser = localStorage.getItem("agentix_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock login logic - accept any email, but default to first mock user if match
    const foundUser = USERS.find(u => u.email === email) || USERS[0];
    
    setUser(foundUser);
    localStorage.setItem("agentix_user", JSON.stringify(foundUser));
    setIsLoading(false);
    
    toast({
      title: "Welcome back",
      description: `Signed in as ${foundUser.name}`,
    });
    
    setLocation("/");
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    // Simulate Google Popup delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const googleUser = USERS[0]; // Default to admin for demo
    
    setUser(googleUser);
    localStorage.setItem("agentix_user", JSON.stringify(googleUser));
    setIsLoading(false);
    
    toast({
      title: "Signed in with Google",
      description: `Welcome back, ${googleUser.name}`,
    });
    
    setLocation("/");
  };

  const logout = () => {
    setUser(null);
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
