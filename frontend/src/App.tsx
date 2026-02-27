import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Chat } from "@/pages/Chat";

function ProtectedRoute({ authed }: { authed: boolean }) {
  if (!authed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <Toaster />
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
          <Route element={<ProtectedRoute authed={session !== null} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat/:docId" element={<Chat />} />
          </Route>
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
