import { useCallback, useState } from "react";
import { createChatSession } from "../lib/api";

const STORAGE_KEY = "coconut_chat_session_id";

export function useSession() {
  const [sessionId, setSessionId] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });

  /**
   * Return the current session.
   *
   * If there is no current session, create one.
   */
  const ensureSession = useCallback(async () => {
    if (sessionId) {
      return sessionId;
    }

    const data = await createChatSession();

    const newId = Number(data.session_id);

    localStorage.setItem(STORAGE_KEY, String(newId));
    setSessionId(newId);

    return newId;
  }, [sessionId]);

  /**
   * ALWAYS create a brand-new chat session.
   *
   * This is used when:
   * - User clicks "New Chat"
   * - User scans a NEW image
   */
  const createSession = useCallback(async () => {
    const data = await createChatSession();

    const newId = Number(data.session_id);

    localStorage.setItem(STORAGE_KEY, String(newId));
    setSessionId(newId);

    return newId;
  }, []);

  /**
   * Create a fresh session and replace the current one.
   */
  const resetSession = useCallback(async () => {
    return createSession();
  }, [createSession]);

  /**
   * Forget the local session.
   */
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
  }, []);

  return {
    sessionId,
    setSessionId,
    ensureSession,
    createSession,
    resetSession,
    clearSession,
  };
}