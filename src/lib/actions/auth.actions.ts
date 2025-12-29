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

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // emailRedirectTo: `${origin}/auth/callback`, // Supabase will handle confirmation
        },
    })

    if (error) {
        console.error('Signup error:', error.message)
        return redirect(`/login?error=${encodeURIComponent(error.message)}&view=signup`)
    }

    // Redirect to onboarding to select or create a station
    revalidatePath('/', 'layout')
    return redirect('/onboarding')
}


export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}