import { type FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { listIncomeSources } from "@/api/incomeSources";
import { createTransaction } from "@/api/transactions";
import type { Account, Category, IncomeSource, TransactionCreate } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import AppBadgeSync from "@/components/pwa/AppBadgeSync";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import OfflineBanner from "@/components/pwa/OfflineBanner";
import PushPermissionRequest from "@/components/pwa/PushPermissionRequest";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { clearAppBadgeIfSupported } from "@/hooks/useAppBadge";
import { Button } from "@/ui/button";
import { todayIsoDate } from "@/utils/dates";
import { parseMoneyInputToCents } from "@/utils/money";
import { toLocalProblem } from "@/lib/problemDetails";
import { optionQueryKeys } from "@/query/queryKeys";
import { cn } from "@/lib/utils";

const appLinks = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/analytics", label: "Analytics" },
  { to: "/app/accounts", label: "Accounts" },
  { to: "/app/categories", label: "Categories" },
  { to: "/app/income-sources", label: "Income Sources" },
  { to: "/app/bills", label: "Bills" },
  { to: "/app/savings", label: "Savings" },
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
  { to: "/app/categories", label: "Categories" },
  { to: "/app/income-sources", label: "Income Sources" },
  { to: "/app/bills", label: "Bills" },
  { to: "/app/savings", label: "Savings" }
];
const mobileSectionTitles: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (path) => path.startsWith("/app/dashboard"), title: "Dashboard" },
  { match: (path) => path.startsWith("/app/transactions/import"), title: "Import transactions" },
  { match: (path) => path.startsWith("/app/transactions"), title: "Transactions" },
  { match: (path) => path.startsWith("/app/budgets"), title: "Budgets" },
  { match: (path) => path.startsWith("/app/analytics"), title: "Analytics" },
  { match: (path) => path.startsWith("/app/accounts"), title: "Accounts" },
  { match: (path) => path.startsWith("/app/categories"), title: "Categories" },
  { match: (path) => path.startsWith("/app/income-sources"), title: "Income Sources" },
  { match: (path) => path.startsWith("/app/bills"), title: "Bills" },
  { match: (path) => path.startsWith("/app/savings"), title: "Savings" }
];

const EMPTY_FORM: TransactionFormState = {
  type: "expense",
  accountId: "",
  categoryId: "",
  incomeSourceId: "",
  mood: "",
  impulseTag: "",
  amount: "",
  date: "",
  merchant: "",
  note: ""
};

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { apiClient, logout, user } = useAuth();
  const queryClient = useQueryClient();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  const currencyCode = user?.currency_code ?? "USD";
  const isStandaloneMode =
    typeof window !== "undefined" &&
    ((typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);

  const accountsQuery = useQuery({
    queryKey: optionQueryKeys.accounts({ includeArchived: false, limit: 100 }),
    enabled: formOpen,
    staleTime: 60_000,
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listAccounts(apiClient, {
        includeArchived: false,
        limit: 100
      })
  });
  const categoriesQuery = useQuery({
    queryKey: optionQueryKeys.categories({ includeArchived: false, type: "all", limit: 100 }),
    enabled: formOpen,
    staleTime: 60_000,
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived: false,
        type: "all",
        limit: 100
      })
  });
  const incomeSourcesQuery = useQuery({
    queryKey: optionQueryKeys.incomeSources({ includeArchived: false }),
    enabled: formOpen,
    staleTime: 60_000,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listIncomeSources(apiClient, { includeArchived: false })
  });

  const accounts: Account[] = accountsQuery.data?.items ?? [];
  const categories: Category[] = categoriesQuery.data?.items ?? [];
  const incomeSources: IncomeSource[] = incomeSourcesQuery.data?.items ?? [];

  useEffect(() => {
    void clearAppBadgeIfSupported();
  }, []);

  useEffect(() => {
    // Prevent Safari restoring mid-scroll when entering app routes after auth redirect.
    const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
    if (!isJsdom && typeof window.scrollTo === "function") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        // jsdom and older embedded webviews may not fully implement scroll options.
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!formOpen) {
      return;
    }
    const queryError = accountsQuery.error ?? categoriesQuery.error ?? incomeSourcesQuery.error ?? null;
    if (queryError) {
      setFormProblem(queryError);
    } else {
      setFormProblem(null);
    }
  }, [accountsQuery.error, categoriesQuery.error, formOpen, incomeSourcesQuery.error]);

  function setField(field: keyof TransactionFormState, value: string) {
    setFormState((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "type") {
        next.categoryId = "";
        next.incomeSourceId = "";
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
    const amount = parseMoneyInputToCents(currencyCode, formState.amount);
    if (amount === null) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "Amount must be a positive money value with up to two decimals."
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
      income_source_id: formState.type === "income" ? formState.incomeSourceId || null : null,
      amount_cents: amount,
      date: formState.date,
      merchant: formState.merchant.trim() || undefined,
      note: formState.note.trim() || undefined,
      ...(formState.mood ? { mood: formState.mood } : {}),
      ...(formState.impulseTag ? { is_impulse: formState.impulseTag === "impulsive" } : {})
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
    <div className="min-h-screen overflow-x-hidden pb-[calc(8.75rem_+_env(safe-area-inset-bottom))] md:pb-0">
      <OfflineBanner />
      <AppBadgeSync />
      <InstallPrompt />

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
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10">
                    <img
                      src="/apple-touch-icon.png"
                      alt="BudgetBuddy logo"
                      className="h-5 w-5 rounded-md object-cover"
                    />
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
        <PushPermissionRequest />
        <Outlet />
      </main>

      {!isDesktop ? (
        <nav
          className={cn(
            "pointer-events-none fixed inset-x-0 z-40 box-border",
            isStandaloneMode
              ? "bottom-[max(0px,_calc(env(safe-area-inset-bottom)_-_0.25rem))] px-4"
              : "bottom-[calc(0.9rem_+_env(safe-area-inset-bottom))] px-3"
          )}
          style={{
            paddingLeft: isStandaloneMode
              ? "max(1rem, calc(env(safe-area-inset-left) + 0.5rem))"
              : "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: isStandaloneMode
              ? "max(1rem, calc(env(safe-area-inset-right) + 0.5rem))"
              : "max(0.75rem, env(safe-area-inset-right))"
          }}
          aria-label="Main"
        >
          <div
            className={cn(
              "pointer-events-auto mx-auto w-full overflow-x-clip rounded-2xl border border-border/80 bg-card/95 p-2 shadow-lg backdrop-blur",
              isStandaloneMode ? "max-w-[30rem]" : "max-w-none"
            )}
          >
            <div className="grid min-w-0 grid-cols-5 gap-1">
              {mobilePrimaryLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => {
                    setOverflowOpen(false);
                  }}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-12 min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-1 text-[clamp(9px,2.6vw,11px)] font-semibold",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <Button
                type="button"
                variant={overflowOpen ? "outline" : "ghost"}
                className="flex min-h-12 min-w-0 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-xl px-2 text-[11px] font-semibold"
                aria-expanded={overflowOpen}
                aria-controls="mobile-nav-overflow"
                onClick={() => setOverflowOpen((current) => !current)}
              >
                More
              </Button>
            </div>
            {overflowOpen ? (
              <div id="mobile-nav-overflow" className="mt-2 grid gap-1 border-t border-border/70 pt-2">
                {mobileSecondaryLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => {
                      setOverflowOpen(false);
                    }}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-2 text-sm font-semibold",
                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setOverflowOpen(false);
                    void handleLogout();
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}

      {isTransactionsContext ? (
        isDesktop ? (
          <Button size="lg" className="fixed bottom-8 right-4 z-30 min-h-12 rounded-full px-5 shadow-lg" onClick={openQuickTransaction}>
            New transaction
          </Button>
        ) : (
          <Button
            className="fixed bottom-[calc(6rem_+_env(safe-area-inset-bottom))] z-30 h-[clamp(2.9rem,11vw,3.35rem)] w-[clamp(2.9rem,11vw,3.35rem)] rounded-full p-0 shadow-xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{ right: "max(1rem, env(safe-area-inset-right))" }}
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
        incomeSources={incomeSources}
        currencyCode={currencyCode}
        problem={formProblem}
        onFieldChange={setField}
        onClose={closeQuickTransaction}
        onSubmit={handleSubmitQuickTransaction}
      />
    </div>
  );
}
