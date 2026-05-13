import { User } from "@/types";

export const getUser = (): User | null => {
  if (typeof window === "undefined") return null;

  const user = window.localStorage.getItem("user");
  if (!user) return null;

  try {
    return JSON.parse(user) as User;
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
};

export const saveAuth = (token: string, user: Omit<User, "token">) => {
  window.localStorage.setItem("token", token);
  window.localStorage.setItem("user", JSON.stringify({ ...user, token }));
};

export const clearAuth = () => {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
};

export const logout = () => {
  clearAuth();
  window.location.href = "/login";
};

export const isAuthenticated = (): boolean => !!getToken();
