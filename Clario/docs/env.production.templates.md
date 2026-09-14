# Production Environment Configuration Templates

This document outlines all required environment variables, secrets, and configuration templates across **Atlas IO**, **Clario Frontend**, **Clario Backend (Render)**, and **Supabase Edge Functions**.

---

## 1. Clario Frontend (Vercel / Local `.env`)

File: `Clario/.env` or Vercel Environment Variables:

```bash
# Supabase Connectivity (Direct upload to clario-raw bucket)
VITE_SUPABASE_URL="https://sqthvliapkauoxieiwfb.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Render Backend URL
VITE_CLARIO_SERVER_URL="https://clario-l5d0.onrender.com"
```

---

## 2. Clario Backend (Render Environment)

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

## 3. Atlas IO (Vercel / Local `.env`)

File: `Atlas io/.env` or Vercel Environment Variables:

```bash
# Supabase Connectivity
VITE_SUPABASE_PROJECT_ID="sqthvliapkauoxieiwfb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://sqthvliapkauoxieiwfb.supabase.co"

# Live Clario Video Processing Studio
VITE_CLARIO_URL="https://clario-l5d0.onrender.com"

# Outbound Defaults
VITE_SENDER_NAME="Ben"
```

---

## 4. Supabase Database Bootstrap

To bootstrap a fresh Supabase project or apply all idempotent tables and storage buckets:
1. Open the **SQL Editor** in the Supabase Dashboard.
2. Paste the contents of `Atlas io/supabase/bootstrap.sql`.
3. Click **Run**.
