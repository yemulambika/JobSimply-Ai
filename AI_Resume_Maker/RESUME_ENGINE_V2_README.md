# Resume Engine V2 - Architecture Documentation

## Overview

The Resume Engine V2 is a complete rebuild of the resume parsing, editing, and generation system. It follows the architecture of modern resume platforms like Jobright, Simplify, Teal, and Enhancv.

## Architecture Flow

```
Resume Upload
     ↓
Universal Resume Parser
     ↓
Resume JSON (Source of Truth)
     ↓
PostgreSQL (JSONB Storage)
     ↓
Resume Editor (JSON edits only)
     ↓
ATS Engine (Real-time scoring)
     ↓
AI Tailoring (Clones JSON)
     ↓
Resume Renderer (Templates → HTML/PDF)
     ↓
Download (PDF/DOCX/HTML/TXT/MD)
```

## Source of Truth

The Resume JSON is the ONLY source of truth. Everything operates on this structured data.

```json
{
  "personalInfo": { "name": "", "email": "", "phone": "" },
  "summary": "",
  "skills": { "programming": [], "frontend": [] },
  "experience": [],
  "projects": [],
  "education": [],
  "certifications": [],
  "achievements": [],
  "links": {},
  "customSections": []
}
```

## Supported File Formats

- PDF (with OCR fallback for scanned documents)
- DOCX (Microsoft Word)
- DOC (Legacy Word)
- TXT (Plain text)
- RTF (Rich Text Format)
- HTML (Web pages)

## Features

### 1. Universal Resume Parser
- Multi-format text extraction
- OCR support for scanned PDFs
- Multi-column layout detection
- Semantic section matching
- Link extraction (all URLs preserved)
- Profile image extraction

### 2. Resume Editor
- Section-based editing
- Drag and drop reordering
- Add/Delete/Rename sections
- Auto-save with version history
- Real-time ATS score updates

### 3. ATS Engine
- Real-time scoring from JSON
- Section-wise breakdown
- Keyword matching against job descriptions
- Improvement suggestions

### 4. AI Tailoring
- Clones base JSON (never modifies original)
- Section-wise optimization
- Tone adjustment (professional, concise, detailed, casual)
- Keyword injection

### 5. Resume Renderer
- Multiple templates (modern, professional, minimalist, creative, technical)
- HTML generation
- PDF/DOCX export
- Markdown/TXT export

## API Endpoints

### POST /api/v2/resumes/upload
Upload and parse a resume file.

### GET /api/v2/resumes
List all resumes for authenticated user.

### GET /api/v2/resumes/:id
Get specific resume with full JSON.

### PATCH /api/v2/resumes/:id
Update resume JSON (triggers auto-save).

### POST /api/v2/resumes/:id/tailor
Create tailored version for job application.

### GET /api/v2/resumes/:id/versions
Get version history.

### POST /api/v2/resumes/:id/versions/:version/restore
Restore to specific version.

### GET /api/v2/resumes/:id/download/:format
Download resume (html, markdown, txt, pdf).

## Database Schema

```prisma
model Resume {
  id               Int    @id @default(autoincrement())
  userId           Int
  title            String
  fileUrl          String?
  baseResumeJSON   Json   @default("{}")
  tailoredResumeJSON Json  @default("{}")
  template         String @default("modern")
  status           String @default("draft")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## File Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── repositories/
│   └── resumeRepository.js    # Data access layer
├── services/
│   ├── UniversalResumeParser.js # Parser with OCR
│   ├── atsEngine.js         # ATS scoring engine
│   ├── resumeRenderer.js    # Template rendering
│   └── resumeControllerV2.js # REST API controllers
└── routes/
    └── resumeV2Routes.js    # API routes

frontend/
├── src/
│   ├── types/
│   │   └── resume.ts        # TypeScript types
│   ├── services/
│   │   └── resumeApi.ts     # API client
│   └── components/
│       └── ResumeEditorV2.tsx # Main editor component
```

## Running the System

### Backend
```bash
cd AI_Resume_Maker/backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd AI_Resume_Maker/frontend
npm install
npm run dev
```

## Environment Variables

```env
DATABASE_URL="postgresql://..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
GROQ_API_KEY="..."
OPENROUTER_API_KEY="..."
```

## Migration Guide

This is a complete architecture replacement. Old resume data will need to be migrated to the new JSONB format. See migration scripts for details.