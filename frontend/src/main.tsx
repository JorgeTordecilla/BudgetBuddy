import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";

import "./index.css";
import { AuthProvider } from "@/auth/AuthContext";
import PageSkeleton from "@/components/ui/PageSkeleton";
import SuccessToast from "@/components/feedback/SuccessToast";
import ProblemDetailsToast from "@/components/errors/ProblemDetailsToast";
import PWAUpdatePrompt from "@/components/pwa/PWAUpdatePrompt";
import StandaloneNavigationBridge from "@/components/pwa/StandaloneNavigationBridge";
import ErrorBoundary from "@/errors/ErrorBoundary";
import AppShell from "@/routes/AppShell";
import Login from "@/routes/Login";
import Register from "@/routes/Register";
import RequireAuth from "@/routes/RequireAuth";
import RouteChunkErrorBoundary from "@/routes/RouteChunkErrorBoundary";
import { createAppQueryClient } from "@/query/queryClient";
import { initializeObservability } from "@/observability/runtime";
import { getRequiredRootElement } from "@/lib/rootElement";
import { incrementPwaSessionCount } from "@/lib/pwaSessionCounter";

const Dashboard = lazy(() => import("@/routes/Dashboard"));
const AnalyticsPage = lazy(() => import("@/features/analytics/AnalyticsPage"));
const BudgetsPage = lazy(() => import("@/features/budgets/BudgetsPage"));
const TransactionsImportPage = lazy(() => import("@/features/transactions/import/TransactionsImportPage"));
const AccountsPage = lazy(() => import("@/pages/AccountsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const IncomeSourcesPage = lazy(() => import("@/pages/IncomeSourcesPage"));
const BillsPage = lazy(() => import("@/pages/BillsPage"));
const SavingsPage = lazy(() => import("@/pages/SavingsPage"));
const TransactionsPage = lazy(() => import("@/pages/TransactionsPage"));

function renderLazyRoute(element: React.ReactNode, routeName: string) {
  return (
    <RouteChunkErrorBoundary routeName={routeName}>
      <Suspense fallback={<PageSkeleton title={`Loading ${routeName}...`} />}>{element}</Suspense>
    </RouteChunkErrorBoundary>
  );
}

function AppRouterRoot() {
  return (
    <>
      <StandaloneNavigationBridge />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <AppRouterRoot />,
    children: [
      { path: "/", element: <Navigate to="/app/dashboard" replace /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      {
        path: "/app",
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
          { path: "dashboard", element: renderLazyRoute(<Dashboard />, "Dashboard") },
          { path: "analytics", element: renderLazyRoute(<AnalyticsPage />, "Analytics") },
          { path: "accounts", element: renderLazyRoute(<AccountsPage />, "Accounts") },
          { path: "categories", element: renderLazyRoute(<CategoriesPage />, "Categories") },
          { path: "income-sources", element: renderLazyRoute(<IncomeSourcesPage />, "Income Sources") },
          { path: "bills", element: renderLazyRoute(<BillsPage />, "Bills") },
          { path: "savings", element: renderLazyRoute(<SavingsPage />, "Savings") },
          { path: "budgets", element: renderLazyRoute(<BudgetsPage />, "Budgets") },
          { path: "transactions", element: renderLazyRoute(<TransactionsPage />, "Transactions") },
          { path: "transactions/import", element: renderLazyRoute(<TransactionsImportPage />, "Transaction Import") }
        ]
      }
    ]
  }
]);

const queryClient = createAppQueryClient();
initializeObservability();
if (typeof window !== "undefined") {
  incrementPwaSessionCount();
}

ReactDOM.createRoot(getRequiredRootElement()).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <RouterProvider router={router} />
          <PWAUpdatePrompt />
          <ProblemDetailsToast />
          <SuccessToast />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
