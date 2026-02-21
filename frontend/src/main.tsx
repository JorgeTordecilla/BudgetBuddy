import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import "./index.css";
import AppShell from "@/routes/AppShell";
import Dashboard from "@/routes/Dashboard";
import Login from "@/routes/Login";
import RequireAuth from "@/routes/RequireAuth";

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
      { path: "dashboard", element: <Dashboard /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
