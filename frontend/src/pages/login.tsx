import { useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { BoxesIcon, Loader2Icon } from "lucide-react"

import { Field } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"

export function LoginPage() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { data: config } = useQuery({
    queryKey: ["auth-config"],
    queryFn: () => api.get<{ allow_registration: boolean }>("/auth/config"),
  })

  const from = (location.state as { from?: string } | null)?.from ?? "/"
  if (user) return <Navigate to={from} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await (mode === "login" ? login : register)(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BoxesIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Simple API Generator</h1>
            <p className="text-sm text-muted-foreground">Turn any table into a REST API</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create an account"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Enter your credentials to continue." : "Choose a username and a password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Username" htmlFor="username">
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
              </Field>
              <Field label="Password" htmlFor="password" hint={mode === "register" ? "At least 8 characters" : undefined}>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "register" ? 8 : undefined}
                  required
                />
              </Field>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="w-full">
                {busy && <Loader2Icon className="animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
              {config?.allow_registration && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login")
                    setError(null)
                  }}
                >
                  {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
