import { createContext, useState, useEffect, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// Create the Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Create the context
export const SessionContext = createContext();

// Context provider
export const SessionContextProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    // Cleanup
    return () => {
      authListener.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use session context
export const useSessionContext = () => useContext(SessionContext);
