# Production Environment Configuration Templates

This document outlines all required environment variables, secrets, and configuration templates across **Atlas IO**, **Clario Frontend**, **Clario Backend (Render)**, and **Supabase Edge Functions**.

---

## 1. Atlas IO (Vercel / Local `.env`)

File: `.env` or Vercel Environment Variables:

```bash
# Supabase Connectivity
VITE_SUPABASE_PROJECT_ID="sqthvliapkauoxieiwfb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://sqthvliapkauoxieiwfb.supabase.co"

# Live Clario Video Processing Studio
VITE_CLARIO_URL="https://clario-l5d0.onrender.com"

# Outbound Defaults
VITE_SENDER_NAME="Ben"

# Optional External API Keys (Can also be managed securely in Supabase atlas_user_settings table)
METAPHOR_API_URL="https://metaphor-backend.onrender.com"
METAPHOR_API_KEY=""
RESEND_API_KEY=""
VITE_RESEND_API_KEY=""
```

---

## 2. Clario Frontend (Vercel / Local `.env`)

File: `Clario/.env` or Vercel Environment Variables:

```bash
# Supabase Connectivity (Direct upload to clario-raw bucket)
VITE_SUPABASE_URL="https://sqthvliapkauoxieiwfb.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Render Backend URL
VITE_CLARIO_SERVER_URL="https://clario-l5d0.onrender.com"
```

---

## 3. Clario Backend (Render Environment)

Configure in **Render Dashboard > Clario Service > Environment**:

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | `https://sqthvliapkauoxieiwfb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role secret key for bucket & table admin | `eyJhbGciOiJIUzI1Ni...` |
| `GEMINI_API_KEY` | Google AI Studio Key for Vision & Script Analysis | `AIzaSy...` |
| `ALLOWED_ORIGINS` | Permitted frontend origins | `http://localhost:5173,https://clariovid.vercel.app` |
| `MAX_UPLOAD_BYTES` | Maximum upload file size | `209715200` (200 MB) |
| `PORT` | Auto-set by Render | `8000` or `10000` |

---

## 4. Supabase Edge Functions Secrets Checklist

Project: `sqthvliapkauoxieiwfb` ("Pseduonyms", eu-west-1)

Set via CLI:
`npx supabase secrets set KEY=VALUE`

| Secret | Status | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Active | Powers `decompose-prompt`, `discover-leads` and pain analysis |
| `GROQ_API_KEY` | ✅ Active | Fast fallback model (`openai/gpt-oss-120b`) |
| `SMTP_EMAIL` | ✅ Active | Gmail address for live outbound (`multiverseglobals@gmail.com`) |
| `SMTP_PASSWORD` | ✅ Active | Google App Password (16 characters) for authenticated SMTP |
| `SENDER_NAME` | ✅ Active | Display name for cold emails (`Ben`) |
| `OPENAI_API_KEY` | Optional | Fallback model (if credit quota available) |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Internal system authentication between Edge Functions |

---

## 5. Supabase Database Bootstrap

To bootstrap a fresh Supabase project or apply all idempotent tables and storage buckets:
1. Open the **SQL Editor** in the Supabase Dashboard.
2. Paste the contents of `supabase/bootstrap.sql`.
3. Click **Run**.
