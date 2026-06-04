import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

type Role = "admin" | "tesoureiro" | "visualizador";

const routePermissions: Record<string, Role[]> = {
  "/dashboard": ["admin", "tesoureiro", "visualizador"],
  "/entries": ["admin", "tesoureiro"],
  "/expenses": ["admin", "tesoureiro"],
  "/members": ["admin", "tesoureiro"],
  "/cost-centers": ["admin"],
  "/settings": ["admin"],
  "/reports": ["admin", "tesoureiro"],
  "/receipts": ["admin", "tesoureiro"],
};

export function useAuthGuard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      setLocation("/");
      return;
    }

    // Get current path
    const currentPath = window.location.pathname;
    const allowedRoles = routePermissions[currentPath];

    if (allowedRoles && user && !allowedRoles.includes(user.role as Role)) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, loading, setLocation]);

  return { user, isAuthenticated, loading };
}

export function hasPermission(userRole: Role | undefined, requiredRoles: Role[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
}

export function isAdmin(userRole: Role | undefined): boolean {
  return userRole === "admin";
}

export function isTreasurer(userRole: Role | undefined): boolean {
  return userRole === "admin" || userRole === "tesoureiro";
}

export function isViewer(userRole: Role | undefined): boolean {
  return userRole === "admin" || userRole === "tesoureiro" || userRole === "visualizador";
}
