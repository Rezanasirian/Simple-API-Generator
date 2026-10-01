import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router"
import {
  BookOpenIcon,
  BoxesIcon,
  DatabaseIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserCogIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"

import { ChangePasswordDialog } from "@/components/change-password"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboardIcon, end: true },
  { to: "/apis", label: "APIs", icon: BoxesIcon },
  { to: "/data-sources", label: "Data sources", icon: DatabaseIcon },
  { to: "/api-keys", label: "API keys", icon: KeyRoundIcon },
  { to: "/users", label: "Users", icon: UsersIcon, admin: true },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BoxesIcon className="size-4" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">API Generator</div>
        <div className="text-xs text-muted-foreground">No-code REST APIs</div>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  return (
    <nav className="flex h-full flex-col gap-6 p-4">
      <Logo />
      <div className="flex flex-1 flex-col gap-1">
        {NAV.filter((item) => !item.admin || user?.role === "admin").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive && "bg-accent text-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
      <a
        href="/docs"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <BookOpenIcon className="size-4" />
        API documentation
      </a>
    </nav>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>
      <Icon />
    </Button>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [passwordOpen, setPasswordOpen] = useState(false)
  if (!user) return null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
              {user.username.slice(0, 2)}
            </span>
            <span className="hidden text-sm sm:inline">{user.username}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div>{user.username}</div>
            <div className="text-xs font-normal text-muted-foreground capitalize">{user.role}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <UserCogIcon /> Change password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={logout} variant="destructive">
            <LogOutIcon /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r bg-sidebar md:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r bg-sidebar shadow-xl">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-3"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <XIcon />
            </Button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </Button>
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu />
        </header>
        <main key={location.pathname} className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
