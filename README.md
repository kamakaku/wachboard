# Wachboard - Dienst- & Fahrzeugbesetzung

This is a Next.js web application for managing duty and vehicle rostering for emergency services like fire departments.

## Tech Stack

- **Frontend**: Next.js (App Router) + TypeScript + TailwindCSS
- **UI**: shadcn/ui
- **Drag & Drop**: dnd-kit
- **Backend/API**: Next.js Route Handlers + Server Actions
- **Auth & DB**: Supabase (Auth + Postgres + Row Level Security)
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime
- **Deployment**: Vercel

## Setup & Deployment

### 1. Supabase Project Setup

1.  **Create a new Supabase project**: Go to [supabase.com](https://supabase.com/), sign in, and create a new project.
2.  **Get your API keys**: In your project dashboard, go to `Settings` -> `API`. You will need the `Project URL` and the `anon` `public` key.
3.  **Get your Service Role key**: In the same API settings page, find the `service_role` `secret` key. **Treat this like a password and never expose it on the client-side.**
4.  **Create a `.env.local` file**: Copy the `.env.example` file to a new file named `.env.local` in the root of the project. Fill in the values you just obtained:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
    ```
5.  **Run the SQL migration**:
    *   Go to the `SQL Editor` in your Supabase project dashboard.
    *   Click `+ New query`.
    *   Copy the entire content of the `/supabase/migrations/0000_initial_schema.sql` file from this repository.
    *   Paste the content into the SQL editor and click `RUN`. This will create all the necessary tables, relationships, row-level security policies, and seed data.
6.  **Enable Email/Password Authentication**:
    *   Go to `Authentication` -> `Providers` in your Supabase dashboard.
    *   Enable the `Email` provider. By default, `Enable email signup` is turned on. For this project, you might want to disable "Confirm email" for easier testing, but it's recommended to keep it enabled for production.
7.  **Set up Storage Buckets**:
    *   Go to `Storage` in your Supabase dashboard.
    *   Create a new bucket named `people-photos`. Make it a **public** bucket.
    *   Create a new bucket named `station-crests`. Make it a **public** bucket.
    *   Go to `Storage` -> `Policies`. You will find existing policies for the buckets. We will use RLS policies on table access to control who can upload/modify the URLs, so the public read access for the buckets is fine.

### 2. Vercel Deployment

1.  **Create a new Vercel project**: Go to [vercel.com](https://vercel.com/) and create a new project, linking it to your Git repository (e.g., on GitHub).
2.  **Configure Environment Variables**: In the Vercel project settings, navigate to `Settings` -> `Environment Variables`. Add the same three variables from your `.env.local` file:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
3.  **Deploy**: Vercel will automatically detect that this is a Next.js project. It will build and deploy the application. Any push to your main branch will trigger a new deployment.

### 3. Running Locally

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Seed Data

The initial SQL migration (`0000_initial_schema.sql`) includes seed data to get you started:
- 1 Organization ("Feuerwehr")
- 1 Station ("Wache 22")
- 4 Divisions ("A-Dienst" to "D-Dienst")
- An Admin user (you can sign up with `admin@example.com`, password: `password`)
- Sample personnel
- Default vehicle configurations
- Default shift templates

The Admin user is associated with the "Wache 22" and can manage all its aspects.
# wachboard
