# CoreVork Audit Portal Deployment Guide

This document provides step-by-step instructions on how to set up, configure, and deploy both the **Frontend** and **Backend** of the CoreVork Audit Portal.

---

## 🛠️ Architecture Overview

The CoreVork Audit Portal is split into two parts:
1. **Frontend (Vite + React + Tailwind CSS)**: Deployed to **Cloudflare Pages** as a static site.
2. **Backend (Node.js + Express + Puppeteer)**: Deployed to a platform supporting Chromium binaries (like **Render** or **Railway**).

> [!WARNING]
> **Why the Backend Cannot be Deployed Directly on Cloudflare Pages:**
> Cloudflare Pages/Workers run on V8 isolates that do not support standard Node.js server binaries or headless browsers. Because the CoreVork backend uses **Puppeteer** (which runs Chromium) to generate high-quality PDF reports, it must be hosted on a service like **Render** or **Railway** which supports running Puppeteer/Chromium.

---

## 🔑 Environment Variables & Where to Get Them

Below is a detailed list of all required environment variables and direct links to retrieve them.

### 1. Frontend Environment Variables (`frontend/.env`)

These variables are prefixed with `VITE_` so that Vite can inject them into the client build.

| Variable | Description | Source / Where to Get It |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | The API URL of your Supabase project. | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | The Public Anonymous API Key for database access. | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `VITE_PDF_SERVICE_URL` | The URL of your deployed backend service. | Deployed Backend URL (e.g., `https://corevork-backend.onrender.com`) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name for storing images. | [Cloudinary Dashboard](https://cloudinary.com/console) → Product Environment Info |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned Upload Preset for uploading audit images. | [Cloudinary Console](https://cloudinary.com/console) → Settings → Upload → Upload Presets |
| `VITE_GROQ_API_KEY` | Groq API key for client-side queries (fallback). | [Groq Console](https://console.groq.com/keys) → API Keys |

---

### 2. Backend Environment Variables (`backend/.env`)

These variables configure the server-side API, AI features, and transactional emails.

| Variable | Description | Source / Where to Get It |
| :--- | :--- | :--- |
| `PORT` | The port the backend runs on. | Set to `3001` locally (Render sets this dynamically) |
| `SUPABASE_URL` | The API URL of your Supabase project. | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret Service Role Key (bypasses RLS to manage invites). | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API (Keep Secret!) |
| `FRONTEND_URL` | The URL of your deployed frontend. | Deployed Cloudflare Pages URL (e.g., `https://corevork.pages.dev`) |
| `GROQ_API_KEY` | Groq API Key used by the AI Checklist Generator. | [Groq Console](https://console.groq.com/keys) → API Keys |
| `RESEND_API_KEY` | Resend API Key for sending invitation emails. | [Resend Dashboard](https://resend.com) → API Keys |

---

## 💾 Third-Party Services Setup

### 1. Supabase Setup
1. Sign up on [Supabase](https://supabase.com).
2. Create a new project.
3. Open the **SQL Editor** in the Supabase Sidebar, paste the contents of `supabase_additions.sql` (found in the root folder), and click **Run**. This configures the Row-Level Security (RLS) policies.
4. Go to **Storage**, create an public bucket named `audit-photos`, and make sure it has read/write policies.
5. In **Auth Settings**:
   - Set the Redirect URLs to:
     - `https://your-frontend-domain.pages.dev/accept-invite`
     - `https://your-frontend-domain.pages.dev/reset-password`

### 2. Cloudinary Setup (For Image Evidence Uploads)
1. Register/Login on [Cloudinary](https://cloudinary.com).
2. Go to **Settings** (Gear Icon) → **Upload**.
3. Scroll to **Upload presets**, and click **Add upload preset**.
4. Set the name to `corevork` (or matching your `VITE_CLOUDINARY_UPLOAD_PRESET`).
5. Change **Signing Mode** to **Unsigned**.
6. Save the settings.

---

## 🚀 Deploying the Frontend (Cloudflare Pages)

1. Sign up/Login to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages** in the left sidebar and click **Create application** → **Pages** tab → **Connect to Git**.
3. Select your repository (`CoreVork_Audit`).
4. Configure the build settings as follows:
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `corevork-audit-portal/frontend` (if you pushed the whole workspace folder, make sure to specify this path)
5. Expand the **Environment variables (advanced)** section and add all your `VITE_` variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PDF_SERVICE_URL`
   - `VITE_CLOUDINARY_CLOUD_NAME`
   - `VITE_CLOUDINARY_UPLOAD_PRESET`
   - `VITE_GROQ_API_KEY`
6. Click **Save and Deploy**. Cloudflare will build the site and provide you with a `*.pages.dev` URL.

---

## ⚡ Deploying the Backend (Render or Railway)

Choose one of the hosting services below.

### Option A: Deploying on Render (Recommended)

1. Sign up/Login to [Render](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `corevork-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `corevork-audit-portal/backend`
5. Go to **Environment** tab, click **Add Environment Variable**, and insert:
   - `PORT`: `3001`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL` (Set this to your Cloudflare Pages URL)
   - `GROQ_API_KEY`
   - `RESEND_API_KEY`
6. **Important Puppeteer Setup on Render:**
   Render environments don't install Chromium by default, causing Puppeteer to fail. To install it:
   - Go to your Web Service settings in Render.
   - Scroll down to the **Advanced** section.
   - Click **Add Buildpack** and add the following community buildpack link:
     `https://github.com/jontewks/puppeteer-heroku-buildpack.git`
   - Alternatively, you can use the official Puppeteer Docker image or configure a custom script.
7. Click **Save Changes** and trigger a deploy.

---

### Option B: Deploying on Railway

1. Sign up/Login to [Railway](https://railway.app).
2. Click **New Project** → **Deploy from GitHub**.
3. Select your repository.
4. Set the **Root Directory** to `corevork-audit-portal/backend`.
5. Under **Variables**, add all of the backend environment variables listed above.
6. Railway automatically detects the node configuration and configures Puppeteer. (If it fails to find Chromium, add `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false` to download Chromium on build).
7. Generate a domain under the service settings to get the public backend URL.
