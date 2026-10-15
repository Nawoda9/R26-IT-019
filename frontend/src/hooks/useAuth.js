import { useCallback, useEffect, useState } from "react";
import { fetchCurrentUser, login as apiLogin, logout as apiLogout, registerAccount } from "../lib/api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, password, email) => {
    const data = await registerAccount(username, password, email);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return { user, checking, login, register, logout };
}
