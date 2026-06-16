import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, AuthResponse } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("smart_tiffin_access_token");
    const userStr = localStorage.getItem("smart_tiffin_user");
    
    if (token && userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
        localStorage.removeItem("smart_tiffin_access_token");
        localStorage.removeItem("smart_tiffin_refresh_token");
        localStorage.removeItem("smart_tiffin_user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = useCallback((data: AuthResponse) => {
    localStorage.setItem("smart_tiffin_access_token", data.accessToken);
    localStorage.setItem("smart_tiffin_refresh_token", data.refreshToken);
    localStorage.setItem("smart_tiffin_user", JSON.stringify(data.user));
    setUser(data.user);
    
    if (data.user.role === "student") {
      setLocation("/student/dashboard");
    } else if (data.user.role === "owner") {
      setLocation("/owner/dashboard");
    }
  }, [setLocation]);

  const logout = useCallback(() => {
    localStorage.removeItem("smart_tiffin_access_token");
    localStorage.removeItem("smart_tiffin_refresh_token");
    localStorage.removeItem("smart_tiffin_user");
    setUser(null);
    queryClient.clear();
    setLocation("/login");
  }, [setLocation, queryClient]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
