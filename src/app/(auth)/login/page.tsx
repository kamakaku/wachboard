"use client"

import { useSearchParams } from 'next/navigation'
import { login, signup } from '@/lib/actions/auth.actions'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { APP_NAME } from '@/lib/constants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const view = searchParams.get('view') || 'login'

  return (
    <Tabs defaultValue={view} className="w-full max-w-sm">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Anmelden</TabsTrigger>
        <TabsTrigger value="signup">Registrieren</TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{APP_NAME} Login</CardTitle>
            <CardDescription>
              Melden Sie sich bei Ihrem Konto an.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email-login">Email</Label>
                <Input id="email-login" type="email" name="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password-login">Passwort</Label>
                <Input id="password-login" type="password" name="password" required />
              </div>
              {error && view === 'login' && <ErrorMessage message={error} />}
              <Button formAction={login} className="w-full">
                Anmelden
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="signup">
        <Card>
          <CardHeader>
            <CardTitle>Neues Konto</CardTitle>
            <CardDescription>
              Erstellen Sie ein neues Konto. Der erste Benutzer wird automatisch Administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input id="email-signup" type="email" name="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password-signup">Passwort</Label>
                <Input id="password-signup" type="password" name="password" required />
              </div>
               {error && view === 'signup' && <ErrorMessage message={error} />}
              <Button formAction={signup} className="w-full">
                Konto erstellen
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Fehler:</strong>
            <p>{message}</p>
        </div>
    )
}
