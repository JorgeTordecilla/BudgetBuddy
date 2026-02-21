import { Outlet } from "react-router-dom";

export default function AppShell() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <span className="text-lg font-semibold">BudgetBuddy</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
