import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Chat } from "@/pages/Chat";

function ProtectedRoute({ session }: { session: Session | null }) {
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute session={session} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat/:docId" element={<Chat />} />
          </Route>
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
