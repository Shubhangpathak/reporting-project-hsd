import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Building2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import logo from "@/images/logo_hsd.webp";

async function apiRequest(path, options = {}) {
  const response = await fetch(path, options);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || "Something went wrong. Please try again.");
  }

  return data;
}

function showError(error) {
  toast.error(error?.message || "Something went wrong. Please try again.");
}

function GoogleSignInButton({ onCredential, disabled }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const clientId = import.meta.env.VITE_GOOGLE_AUTH_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) {
      return undefined;
    }

    const script = document.getElementById("google-identity-services");
    const renderButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => onCredentialRef.current(credential),
      });
      buttonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        logo_alignment: "left",
        width: 320,
      });
    };

    renderButton();
    script?.addEventListener("load", renderButton);
    return () => script?.removeEventListener("load", renderButton);
  }, [clientId]);

  if (!clientId) {
    return <p className="text-sm text-destructive">Google sign-in is not configured.</p>;
  }

  return <div ref={buttonRef} className={disabled ? "pointer-events-none opacity-50" : ""} />;
}

function LoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center bg-background">
      <LoaderCircle className="size-7 animate-spin text-primary" aria-label="Loading" />
    </main>
  );
}

function LoginPage({ onLogin }) {
  const [busy, setBusy] = useState(false);

  const handleCredential = useCallback(async (credential) => {
    setBusy(true);

    try {
      await onLogin(credential);
    } catch (loginError) {
      showError(loginError);
      setBusy(false);
    }
  }, [onLogin]);

  return (
    <main className="grid min-h-svh bg-white text-slate-950 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#eaf3fb] p-14 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="size-9 object-contain" />
          <div>
            <p className="font-semibold tracking-tight">Health Scale Digital</p>
            <p className="text-sm text-slate-500">Digital reporting</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl pb-12">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6fa8]">
            HSD Reporting
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-900">
            Your reporting,
            <br />
            clearly organized.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
            One secure place to access performance data across your organizations.
          </p>
        </div>

        <div className="absolute -bottom-40 -right-28 size-[34rem] rounded-full border-[5rem] border-[#c9e1f5]" />
        <div className="absolute -bottom-24 -right-8 size-72 rounded-full bg-[#3774aa]/10" />
      </section>

      <section className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="" className="size-9 object-contain" />
            <div>
              <p className="font-semibold tracking-tight">Health Scale</p>
              <p className="text-sm text-slate-500">Digital reporting</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-[#2f6fa8]">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
            Sign in to your account
          </h2>
          <p className="mt-3 leading-7 text-slate-500">
            Use the Google account connected to your HSD invitation.
          </p>

          <div className="relative mt-8 flex min-h-11 w-full justify-start">
            <GoogleSignInButton onCredential={handleCredential} disabled={busy} />
            {busy && (
              <div className="absolute inset-y-0 left-0 grid w-80 place-items-center rounded-md bg-white/90">
                <LoaderCircle className="size-5 animate-spin text-[#2f6fa8]" aria-label="Signing in" />
              </div>
            )}
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-400">
            Access is limited to invited team members. Contact your administrator if you need an invitation.
          </p>
        </div>
      </section>
    </main>
  );
}

function OrganizationSelectionPage({ session, onSelect, onLogout, busy }) {
  return (
    <main className="min-h-svh bg-muted/40 px-5 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center">
              <img src={logo} alt="" className="size-7 object-contain" />
            </span>
            <div>
              <p className="font-semibold">Health Scale Digital</p>
              <p className="text-sm text-muted-foreground">Reporting dashboard</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onLogout} disabled={busy}>Sign out</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Choose an organization</CardTitle>
            <CardDescription>
              Select the workspace you want to open. You can switch again from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {session.organizations.map((organization) => (
              <Button
                key={organization.id}
                variant="outline"
                className="h-auto justify-start gap-3 p-4 text-left"
                onClick={() => onSelect(organization.id)}
                disabled={busy}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 />
                </span>
                <span className="truncate font-medium">{organization.name}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function DashboardLayout({ session, onOrganizationChange, onLogout, busy, children }) {
  return (
    <SidebarProvider>
      <AppSidebar
        session={session}
        onOrganizationChange={onOrganizationChange}
        onLogout={onLogout}
        busy={busy}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <p className="text-sm font-medium">
            {session.activeOrganization?.name || "All organizations"}
          </p>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function ClientDashboard({ session, ...actions }) {
  return (
    <DashboardLayout session={session} {...actions}>
      <div className="flex flex-1 flex-col gap-5 p-5 md:p-8">
        <div>
          <p className="text-sm font-medium text-primary">CLIENT DASHBOARD</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {session.activeOrganization.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your reporting workspace is ready for the first dashboard modules.
          </p>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Reporting overview</CardTitle>
            <CardDescription>Campaign and lead reporting will appear here next.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AdminDashboard({ session, onOrganizationChange, ...actions }) {
  return (
    <DashboardLayout
      session={session}
      onOrganizationChange={onOrganizationChange}
      {...actions}
    >
      <div className="flex flex-1 flex-col gap-5 p-5 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an organization only when you need its reporting context.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All organizations</CardTitle>
            <CardDescription>{session.organizations.length} available</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {session.organizations.map((organization) => (
              <div key={organization.id} className="flex items-center gap-3 rounded-xl border p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{organization.name}</span>
                <Button
                  size="sm"
                  variant={session.activeOrganization?.id === organization.id ? "secondary" : "outline"}
                  onClick={() => onOrganizationChange(organization.id)}
                >
                  {session.activeOrganization?.id === organization.id ? "Active" : "Open"}
                </Button>
              </div>
            ))}
            {session.organizations.length === 0 && (
              <p className="text-sm text-muted-foreground">No organizations have been created yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credential) => {
    const nextSession = await apiRequest("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    setSession(nextSession);
    navigate(nextSession.destination, { replace: true });
  }, [navigate]);

  const selectOrganization = useCallback(async (organizationId) => {
    setBusy(true);

    try {
      const nextSession = await apiRequest("/api/auth/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      window.location.assign(nextSession.destination);
    } catch (requestError) {
      showError(requestError);
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setBusy(true);

    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      setSession(null);
      navigate("/login", { replace: true });
    } catch (requestError) {
      showError(requestError);
    } finally {
      setBusy(false);
    }
  }, [navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  const clientHome = session?.activeOrganization ? "/dashboard" : "/select-organization";
  const home = session?.user.role === "platform_admin" ? "/admin" : clientHome;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to={home} replace /> : <LoginPage onLogin={login} />}
      />
      <Route
        path="/select-organization"
        element={
          !session ? <Navigate to="/login" replace />
            : session.user.role === "platform_admin" ? <Navigate to="/admin" replace />
              : session.activeOrganization ? <Navigate to="/dashboard" replace />
                : <OrganizationSelectionPage
                    session={session}
                    onSelect={selectOrganization}
                    onLogout={logout}
                    busy={busy}
                  />
        }
      />
      <Route
        path="/dashboard"
        element={
          !session ? <Navigate to="/login" replace />
            : session.user.role !== "client" ? <Navigate to="/admin" replace />
              : !session.activeOrganization ? <Navigate to="/select-organization" replace />
                : <ClientDashboard
                    session={session}
                    onOrganizationChange={selectOrganization}
                    onLogout={logout}
                    busy={busy}
                  />
        }
      />
      <Route
        path="/admin"
        element={
          !session ? <Navigate to="/login" replace />
            : session.user.role !== "platform_admin" ? <Navigate to={clientHome} replace />
              : <AdminDashboard
                  session={session}
                  onOrganizationChange={selectOrganization}
                  onLogout={logout}
                  busy={busy}
                />
        }
      />
      <Route path="*" element={<Navigate to={session ? home : "/login"} replace />} />
    </Routes>
  );
}

export default App;
