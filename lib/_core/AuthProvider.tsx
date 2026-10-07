import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Api from "./api";
import * as AuthStorage from "./auth";
import { emitAuthChanged, subscribeAuthChanged } from "./auth-events";
import type { AuthenticatedUser } from "./api";
import type { User } from "./auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function asUser(value: AuthenticatedUser): User {
  return {
    id: value.id ?? 0,
    openId: value.openId,
    name: value.name,
    email: value.email,
    loginMethod: value.loginMethod,
    lastSignedIn: new Date(value.lastSignedIn),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await Api.getMe();
    if (!current) {
      setUser(null);
      await AuthStorage.clearUserInfo();
      return null;
    }
    const next = asUser(current);
    setUser(next);
    await AuthStorage.setUserInfo(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    const update = async () => {
      const next = await refresh();
      if (active) setLoading(false);
      return next;
    };
    void update();
    const unsubscribe = subscribeAuthChanged(() => { void update(); });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await Api.logout();
    await AuthStorage.removeSessionToken();
    await AuthStorage.clearUserInfo();
    setUser(null);
    emitAuthChanged();
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, signOut }), [user, loading, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
