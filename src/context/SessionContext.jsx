import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase"; // ajuste o caminho se necessário

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);

  // Carregar sessão ao abrir o app
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };

    getSession();

    // Listener de login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
