# JobSimply — AI Resume & Job Application Tool

## Overview
Full-stack AI-powered career tool. Upload your resume, paste a job description, and get a tailored resume, ATS score, cover letter, and interview prep — all in one place.

## Stack
- **Frontend**: React 19 + Vite (Tailwind CSS v4, MUI, Framer Motion) — port **5000**
- **Backend**: Node.js + Express 5 + Prisma 7 (PostgreSQL) — port **3001**
- **Chrome Extension**: Scrapes job listings from Naukri, LinkedIn, Instahyre (runs in Chrome; not available inside Replit preview)
- **AI**: Gemini / Groq / OpenRouter with regex fallback

## How to Run

Both workflows start automatically:

| Workflow | Command | Port |
|---|---|---|
| `Start application` | `cd AI_Resume_Maker/frontend && npm run dev` | 5000 (webview) |
| `Backend` | `cd AI_Resume_Maker/backend && node src/server.js` | 3001 (console) |

The Vite dev server proxies all `/api/*`, `/auth`, `/resumes`, `/tailor`, etc. routes to the backend.

## Required Secrets
Set these in Replit Secrets:

| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Signs auth tokens — use a long random string |
| `GROQ_API_KEY` or `GEMINI_API_KEY` | AI-powered resume tailoring & analysis (optional; regex fallback works without it) |

## Optional Secrets (for full feature set)
| Secret | Feature |
|---|---|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | PDF/image file uploads |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Email notifications |

## Database
Replit's built-in PostgreSQL. Schema is managed via Prisma.

To push schema changes:
```bash
cd AI_Resume_Maker/backend && npx prisma db push
```

## Project Structure
```
AI_Resume_Maker/
  backend/      — Express API + Prisma + AI providers
  frontend/     — React SPA (Vite)
  extension/    — Chrome extension (popup + content scripts)
```

## AI Features
Without an API key, the app uses a **regex parser** as fallback. This handles basic resume field extraction. For job-tailored resume rewriting and ATS scoring with real AI, add a `GROQ_API_KEY` (free tier available at console.groq.com) or `GEMINI_API_KEY` (Google AI Studio).

## User Preferences
<!-- Add remembered preferences here -->
