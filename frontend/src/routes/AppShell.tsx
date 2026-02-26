import { NavLink, useNavigate, Outlet } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

const appLinks = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/accounts", label: "Accounts" },
  { to: "/app/categories", label: "Categories" }
];

export default function AppShell() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold">BudgetBuddy</span>
            <nav className="flex items-center gap-2" aria-label="Main">
              {appLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                      isActive && "bg-muted text-foreground"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <Button type="button" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
