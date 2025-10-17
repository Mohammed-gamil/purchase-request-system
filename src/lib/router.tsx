import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import AppLayout from "@/components/layout/AppLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import PRList from "@/pages/PRList";
import PRCreate from "@/pages/PRCreate";
import RequestDetailsMailPage from "@/pages/RequestDetailsMailPage";
import InventoryManagement from "@/pages/InventoryManagement";
import Approvals from "@/pages/Approvals";
import Reports from "@/pages/Reports";
import AdminSettings from "@/pages/AdminSettings";
import AdminUsers from "@/pages/AdminUsers";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "prs",
        children: [
          {
            index: true,
            element: <PRList />,
          },
          {
            path: "create",
            element: <PRCreate />,
          },
          {
            path: ":id",
            element: <RequestDetailsMailPage />,
          },
        ],
      },
      {
        path: "requests/:id",
        element: <RequestDetailsMailPage />,
      },
      {
        path: "projects/:id",
        element: <RequestDetailsMailPage />,
      },
      {
        path: "inventory",
        element: <InventoryManagement />,
      },
      {
        path: "approvals",
        element: <Approvals />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "admin",
        children: [
          {
            path: "settings",
            element: <AdminSettings />,
          },
          {
            path: "users",
            element: <AdminUsers />,
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/unauthorized",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
