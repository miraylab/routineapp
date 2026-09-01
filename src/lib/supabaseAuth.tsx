import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

const AUTH_STORAGE_KEY = "yuri-os.supabase-auth.v1";
const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
  };
}

interface AuthContextValue {
  session: SupabaseSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);
let currentAccessToken: string | null = null;

export function getSupabaseAccessToken() {
  return currentAccessToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [loading, setLoading] = useState(true);

  const setStoredSession = useCallback((nextSession: SupabaseSession | null) => {
    currentAccessToken = nextSession?.accessToken ?? null;
    setSession(nextSession);

    try {
      if (nextSession) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as SupabaseSession;
        if (parsed.refreshToken) {
          const refreshed = await refreshSession(parsed.refreshToken);
          if (active) setStoredSession(refreshed);
          return;
        }

        if (parsed.expiresAt > Date.now() + 60_000 && active) {
          setStoredSession(parsed);
        }
      } catch {
        if (active) setStoredSession(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    hydrateSession();

    return () => {
      active = false;
    };
  }, [setStoredSession]);

  useEffect(() => {
    if (!session) return;

    const timeoutMs = Math.max(session.expiresAt - Date.now() - 60_000, 30_000);
    const id = window.setTimeout(() => {
      refreshSession(session.refreshToken)
        .then(setStoredSession)
        .catch(() => setStoredSession(null));
    }, timeoutMs);

    return () => window.clearTimeout(id);
  }, [session, setStoredSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const nextSession = await passwordSignIn(email, password);
      setStoredSession(nextSession);
    },
    [setStoredSession],
  );

  const signOut = useCallback(() => {
    setStoredSession(null);
  }, [setStoredSession]);

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [loading, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-sm text-muted-foreground">
        Carregando sessão...
      </div>
    );
  }

  if (session) return <>{children}</>;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email, password);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não consegui entrar. Confere e-mail e senha.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-s25 rounded-3xl border border-border/60 bg-card p-5"
      >
        <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground">
          YURI OS
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Entrar</h1>
        <div className="mt-5 space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
            className="h-12 w-full rounded-2xl bg-elevated/50 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="press mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

async function passwordSignIn(email: string, password: string) {
  const response = await authFetch("token?grant_type=password", {
    email,
    password,
  });

  return mapAuthResponse(response);
}

async function refreshSession(refreshToken: string) {
  const response = await authFetch("token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });

  return mapAuthResponse(response);
}

async function authFetch(path: string, body: Record<string, string>): Promise<AuthResponse> {
  if (!SUPABASE_REST_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase não configurado nesta versão. Confira as variáveis da Vercel e faça redeploy.",
    );
  }

  const response = await fetch(`${normalizeAuthUrl(SUPABASE_REST_URL)}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await readSupabaseError(response);
    throw new Error(message);
  }

  return (await response.json()) as AuthResponse;
}

function mapAuthResponse(response: AuthResponse): SupabaseSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    user: response.user,
  };
}

function normalizeAuthUrl(value: string | undefined) {
  return value?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "") + "/auth/v1";
}

async function readSupabaseError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: string;
      error_description?: string;
      msg?: string;
      message?: string;
    };
    return (
      payload.error_description ??
      payload.msg ??
      payload.message ??
      payload.error ??
      `Supabase auth: ${response.status} ${response.statusText}`
    );
  } catch {
    return `Supabase auth: ${response.status} ${response.statusText}`;
  }
}
