import { type FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { ApiProblemError } from "@/api/errors";
import { createTransaction } from "@/api/transactions";
import type { Account, Category, ProblemDetails, TransactionCreate } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";
import { todayIsoDate } from "@/utils/dates";
import { cn } from "@/lib/utils";

const appLinks = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/analytics", label: "Analytics" },
  { to: "/app/accounts", label: "Accounts" },
  { to: "/app/categories", label: "Categories" },
  { to: "/app/budgets", label: "Budgets" },
  { to: "/app/transactions", label: "Transactions" }
];

const mobilePrimaryLinks = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/transactions", label: "Transactions" },
  { to: "/app/budgets", label: "Budgets" },
  { to: "/app/analytics", label: "Analytics" }
];

const mobileSecondaryLinks = [
  { to: "/app/accounts", label: "Accounts" },
  { to: "/app/categories", label: "Categories" }
];
const mobileSectionTitles: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (path) => path.startsWith("/app/dashboard"), title: "Dashboard" },
  { match: (path) => path.startsWith("/app/transactions/import"), title: "Import transactions" },
  { match: (path) => path.startsWith("/app/transactions"), title: "Transactions" },
  { match: (path) => path.startsWith("/app/budgets"), title: "Budgets" },
  { match: (path) => path.startsWith("/app/analytics"), title: "Analytics" },
  { match: (path) => path.startsWith("/app/accounts"), title: "Accounts" },
  { match: (path) => path.startsWith("/app/categories"), title: "Categories" }
];

const EMPTY_FORM: TransactionFormState = {
  type: "expense",
  accountId: "",
  categoryId: "",
  amountCents: "",
  date: "",
  merchant: "",
  note: ""
};

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiClient, logout } = useAuth();
  const queryClient = useQueryClient();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(EMPTY_FORM);
  const isDesktop = useIsDesktop();
  const isTransactionsContext = useMemo(
    () => location.pathname.startsWith("/app/transactions") || location.pathname.startsWith("/app/dashboard"),
    [location.pathname]
  );
  const mobileSectionTitle = useMemo(
    () => mobileSectionTitles.find((entry) => entry.match(location.pathname))?.title ?? "Workspace",
    [location.pathname]
  );

  useEffect(() => {
    if (!formOpen) {
      return;
    }
    let active = true;
    void Promise.all([
      listAccounts(apiClient, { includeArchived: false, limit: 100 }),
      listCategories(apiClient, { includeArchived: false, type: "all", limit: 100 })
    ])
      .then(([accountsResponse, categoriesResponse]) => {
        if (!active) {
          return;
        }
        setAccounts(accountsResponse.items);
        setCategories(categoriesResponse.items);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setFormProblem(error);
      });
    return () => {
      active = false;
    };
  }, [apiClient, formOpen]);

  function toLocalProblem(problem: ProblemDetails): ApiProblemError {
    return new ApiProblemError(problem, {
      httpStatus: problem.status,
      requestId: null,
      retryAfter: null
    });
  }

  function setField(field: keyof TransactionFormState, value: string) {
    setFormState((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "type") {
        next.categoryId = "";
      }
      return next;
    });
  }

  function openQuickTransaction() {
    setFormProblem(null);
    setFormState((previous) => ({
      ...EMPTY_FORM,
      date: previous.date || todayIsoDate()
    }));
    setFormOpen(true);
  }

  function closeQuickTransaction() {
    if (submitting) {
      return;
    }
    setFormOpen(false);
  }

  function buildCreatePayload(): TransactionCreate | null {
    const amount = Number(formState.amountCents);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "amount_cents must be an integer greater than zero."
      }));
      return null;
    }
    if (!formState.accountId || !formState.categoryId || !formState.date) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid request",
        status: 400,
        detail: "type, account, category, amount, and date are required."
      }));
      return null;
    }
    return {
      type: formState.type,
      account_id: formState.accountId,
      category_id: formState.categoryId,
      amount_cents: amount,
      date: formState.date,
      merchant: formState.merchant.trim() || undefined,
      note: formState.note.trim() || undefined
    };
  }

  async function handleSubmitQuickTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const payload = buildCreatePayload();
    if (!payload) {
      return;
    }

    setSubmitting(true);
    try {
      await createTransaction(apiClient, payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      ]);
      setFormOpen(false);
      setFormState(EMPTY_FORM);
      publishSuccessToast("Your transaction was saved successfully.");
    } catch (error) {
      setFormProblem(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Logout transport failures must not block local logout navigation.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
          {isDesktop ? (
            <div className="flex min-h-10 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="shrink-0">
                  <p className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">BudgetBuddy</p>
                </div>
                <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto pb-0.5" aria-label="Main">
                  {appLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[0.84rem] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                          isActive && "bg-muted/80 text-foreground"
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3.5 text-[0.83rem]" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-background/85 px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
                    BB
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-foreground">{mobileSectionTitle}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        <Outlet />
      </main>

      {!isDesktop ? (
        <nav
          className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-lg backdrop-blur"
          aria-label="Main"
        >
          <div className="grid grid-cols-5 gap-1">
            {mobilePrimaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 items-center justify-center rounded-xl px-2 text-[11px] font-semibold",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                  )
                }
                onClick={() => setOverflowOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              className={cn(
                "flex min-h-12 items-center justify-center rounded-xl px-2 text-[11px] font-semibold transition-colors",
                overflowOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70"
              )}
              aria-expanded={overflowOpen}
              aria-controls="mobile-nav-overflow"
              onClick={() => setOverflowOpen((current) => !current)}
            >
              More
            </button>
          </div>
          {overflowOpen ? (
            <div id="mobile-nav-overflow" className="mt-2 grid gap-1 border-t border-border/70 pt-2">
              {mobileSecondaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    )
                  }
                  onClick={() => setOverflowOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                onClick={() => {
                  setOverflowOpen(false);
                  void handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </nav>
      ) : null}

      {isTransactionsContext ? (
        isDesktop ? (
          <Button size="lg" className="fixed bottom-8 right-4 z-30 min-h-12 rounded-full px-5 shadow-lg" onClick={openQuickTransaction}>
            New transaction
          </Button>
        ) : (
          <Button
            className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 h-[clamp(2.9rem,11vw,3.35rem)] w-[clamp(2.9rem,11vw,3.35rem)] rounded-full p-0 shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            aria-label="Create transaction"
            onClick={openQuickTransaction}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span className="sr-only">Create transaction</span>
          </Button>
        )
      ) : null}

      <TransactionForm
        open={formOpen}
        title="Create transaction"
        submitLabel="Create transaction"
        submitting={submitting}
        state={formState}
        accounts={accounts}
        categories={categories}
        problem={formProblem}
        onFieldChange={setField}
        onClose={closeQuickTransaction}
        onSubmit={handleSubmitQuickTransaction}
      />
    </div>
  );
}
