'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error.message)
    return redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  return redirect('/app')
}

export async function signup(formData: FormData) {
  const origin = headers().get('origin')
  const supabase = createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // emailRedirectTo: `${origin}/auth/callback`, // Supabase will handle confirmation
    },
  })

  if (signupError) {
    console.error('Signup error:', signupError.message)
    return redirect(`/login?error=${encodeURIComponent(signupError.message)}&view=signup`)
  }

  // If email confirmation is required, Supabase returns no session.
  // In that case, show a friendly message to confirm email instead of a hard error.
  if (!signupData?.session) {
    const message =
      'Bitte bestätige deine Email über den Link in deinem Postfach. Danach kannst du dich anmelden und das Onboarding starten.'
    return redirect(`/login?error=${encodeURIComponent(message)}&view=signup`)
  }

  // Already have a session -> go straight to onboarding
  revalidatePath('/', 'layout')
  return redirect('/onboarding')
}


export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
