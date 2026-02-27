import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import "./index.css";
import { AuthProvider } from "@/auth/AuthContext";
import ProblemDetailsToast from "@/components/errors/ProblemDetailsToast";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import BudgetsPage from "@/features/budgets/BudgetsPage";
import TransactionsImportPage from "@/features/transactions/import/TransactionsImportPage";
import AccountsPage from "@/pages/AccountsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import TransactionsPage from "@/pages/TransactionsPage";
import AppShell from "@/routes/AppShell";
import Dashboard from "@/routes/Dashboard";
import Login from "@/routes/Login";
import RequireAuth from "@/routes/RequireAuth";
import { createAppQueryClient } from "@/query/queryClient";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/dashboard" replace /> },
  { path: "/login", element: <Login /> },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "accounts", element: <AccountsPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "budgets", element: <BudgetsPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "transactions/import", element: <TransactionsImportPage /> }
    ]
  }
]);

const queryClient = createAppQueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ProblemDetailsToast />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
