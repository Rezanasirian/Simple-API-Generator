import type { ReactNode } from "react"
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Loader2Icon } from "lucide-react"

import { AppLayout } from "@/components/layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, useAuth } from "@/hooks/use-auth"
import { ThemeProvider } from "@/hooks/use-theme"
import { LoginPage } from "@/pages/login"

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

const editor = () => import("@/pages/api-editor").then((m) => ({ Component: m.ApiEditorPage }))

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { path: "/", lazy: () => import("@/pages/dashboard").then((m) => ({ Component: m.DashboardPage })) },
          { path: "/apis", lazy: () => import("@/pages/apis").then((m) => ({ Component: m.ApisPage })) },
          { path: "/apis/new", lazy: editor },
          { path: "/apis/:id", lazy: editor },
          {
            path: "/data-sources",
            lazy: () => import("@/pages/data-sources").then((m) => ({ Component: m.DataSourcesPage })),
          },
          { path: "/api-keys", lazy: () => import("@/pages/api-keys").then((m) => ({ Component: m.ApiKeysPage })) },
          { path: "/users", lazy: () => import("@/pages/users").then((m) => ({ Component: m.UsersPage })) },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
