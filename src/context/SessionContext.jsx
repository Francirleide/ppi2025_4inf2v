import { createContext, useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export const SessionContext = createContext({
  handleSignUp: () => {},
  handleSignIn: () => {},
  handleSignOut: () => {},
  session: null,
  sessionLoading: false,
  sessionMessage: null,
  sessionError: null,
});

export function SessionProvider({ children }) {
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [session, setSession] = useState(null);

  // Obter sessão atual + ouvir mudanças
  useEffect(() => {
    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session || null);
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Cadastro ---
  async function handleSignUp(email, password, username) {
    setSessionLoading(true);
    setSessionError(null);
    setSessionMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          user_metadata: {
            username: username,
            admin: false,
          },
          emailRedirectTo: `${window.location.origin}/signin`,
        },
      });

      if (error) throw error;

      if (data?.user) {
        setSessionMessage(
          "Registration successful! Check your email for confirmation."
        );
      }
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setSessionLoading(false);
    }
  }

  // --- Login ---
  async function handleSignIn(email, password) {
    setSessionLoading(true);
    setSessionError(null);
    setSessionMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        setSessionMessage("Sign in Successful!");
      }
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setSessionLoading(false);
    }
  }

  // --- Logout ---
  async function handleSignOut() {
    setSessionLoading(true);
    setSessionError(null);
    setSessionMessage(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setSession(null);
      setSessionMessage("Sign out successful!");

      window.location.href = "/";
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setSessionLoading(false);
    }
  }

  const context = {
    handleSignUp,
    handleSignIn,
    handleSignOut,
    session,
    sessionLoading,
    sessionMessage,
    sessionError,
  };

  return (
    <SessionContext.Provider value={context}>
      {children}
    </SessionContext.Provider>
  );
}
