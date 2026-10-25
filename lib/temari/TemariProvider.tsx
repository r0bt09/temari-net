import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { API_BASE_URL, getApiBaseUrl } from "@/constants/oauth";
import type { TemariGrade } from "@/constants/temari";

export type TemariUser = {
  id: number;
  fullName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  gradeLevel: string;
  coins: number;
  streak: number;
};

type ApiOptions = { method?: string; body?: unknown; headers?: Record<string, string> };
type TemariContextValue = {
  ready: boolean;
  user: TemariUser | null;
  token: string | null;
  apiBaseUrl: string;
  connected: boolean;
  apiRequest: <T>(path: string, options?: ApiOptions) => Promise<T>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, gradeLevel: TemariGrade) => Promise<void>;
  logout: () => Promise<void>;
  updateApiBaseUrl: (value: string) => Promise<void>;
  refreshProfile: () => Promise<TemariUser | null>;
  setUser: (user: TemariUser | null) => void;
};

const SESSION_KEY = "temari-net-session-v1";
const API_KEY = "temari-net-api-base-v1";
const Context = createContext<TemariContextValue | null>(null);
const localDefault = "http://10.0.2.2:5000/api";

const readToken = async () => Platform.OS === "web" ? AsyncStorage.getItem(SESSION_KEY) : SecureStore.getItemAsync(SESSION_KEY);
const writeToken = async (value: string) => Platform.OS === "web" ? AsyncStorage.setItem(SESSION_KEY, value) : SecureStore.setItemAsync(SESSION_KEY, value);
const removeToken = async () => Platform.OS === "web" ? AsyncStorage.removeItem(SESSION_KEY) : SecureStore.deleteItemAsync(SESSION_KEY);

export function normalizeApiBase(value: string): string {
  const clean = value.trim().replace(/\/+$/, "");
  if (!clean) throw new Error("Enter a server address.");
  const withScheme = /^https?:\/\//i.test(clean) ? clean : `http://${clean}`;
  return withScheme.endsWith("/api") ? withScheme : `${withScheme}/api`;
}

function runtimeApiBase(): string {
  const configured = API_BASE_URL || getApiBaseUrl();
  return configured ? normalizeApiBase(configured) : localDefault;
}

async function fetchApi<T>(base: string, token: string | null, path: string, options: ApiOptions = {}): Promise<T> {
  const endpoint = path.startsWith("/api/") ? path.slice(4) : path.startsWith("/") ? path : `/${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${endpoint}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${response.status}).`);
  return body as T;
}

export function TemariProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<TemariUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(runtimeApiBase);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [savedBase, savedToken] = await Promise.all([AsyncStorage.getItem(API_KEY), readToken()]);
        const base = savedBase ? normalizeApiBase(savedBase) : runtimeApiBase();
        if (active) { setApiBaseUrl(base); setToken(savedToken); }
        if (savedToken) {
          const result = await fetchApi<{ user: TemariUser }>(base, savedToken, "/auth/me");
          if (active) { setUser(result.user); setConnected(true); }
        } else if (active) {
          try { await fetchApi(base, null, "/health"); setConnected(true); } catch { setConnected(false); }
        }
      } catch {
        if (active) { setUser(null); setConnected(false); }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const apiRequest = useCallback(async <T,>(path: string, options?: ApiOptions): Promise<T> => {
    try {
      const value = await fetchApi<T>(apiBaseUrl, token, path, options);
      setConnected(true);
      return value;
    } catch (error) {
      setConnected(false);
      throw error;
    }
  }, [apiBaseUrl, token]);

  const applySession = useCallback(async (result: { token: string; user: TemariUser }) => {
    await writeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setConnected(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await fetchApi<{ token: string; user: TemariUser }>(apiBaseUrl, null, "/auth/login", { method: "POST", body: { email, password } });
    await applySession(result);
  }, [apiBaseUrl, applySession]);

  const register = useCallback(async (name: string, email: string, password: string, gradeLevel: TemariGrade) => {
    const result = await fetchApi<{ token: string; user: TemariUser }>(apiBaseUrl, null, "/auth/register", { method: "POST", body: { full_name: name, email, password, grade_level: gradeLevel, role: "student" } });
    await applySession(result);
  }, [apiBaseUrl, applySession]);

  const logout = useCallback(async () => {
    try { await apiRequest("/auth/logout", { method: "POST" }); } catch { /* Local sign-out still works while offline. */ }
    await removeToken();
    setToken(null);
    setUser(null);
  }, [apiRequest]);

  const updateApiBaseUrl = useCallback(async (value: string) => {
    const normalized = normalizeApiBase(value);
    await AsyncStorage.setItem(API_KEY, normalized);
    setApiBaseUrl(normalized);
    setConnected(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const result = await apiRequest<{ user: TemariUser }>("/auth/me");
    setUser(result.user);
    return result.user;
  }, [apiRequest, token]);

  const value = useMemo(() => ({ ready, user, token, apiBaseUrl, connected, apiRequest, login, register, logout, updateApiBaseUrl, refreshProfile, setUser }), [ready, user, token, apiBaseUrl, connected, apiRequest, login, register, logout, updateApiBaseUrl, refreshProfile]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTemari(): TemariContextValue {
  const context = useContext(Context);
  if (!context) throw new Error("useTemari must be rendered inside TemariProvider");
  return context;
}
