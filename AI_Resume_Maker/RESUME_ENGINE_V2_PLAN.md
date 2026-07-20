# Resume Engine V2 - Implementation Plan

## Overview
Complete rewrite of the resume architecture to match Jobright/Simplify/Teal/Enhancv style.

## Architecture Flow
Resume Upload → Universal Resume Parser → Resume JSON → Database → Resume Editor → ATS Engine → AI Tailoring Engine → Resume Renderer → PDF/DOCX Generator

---

## Phase 1: Database Schema (PostgreSQL JSONB)
- [x] Create new Resume model with baseResumeJSON and tailoredResumeJSON
- [x] Create TailoredResume model
- [x] Create ResumeVersion model
- [ ] Run migrations

## Phase 2: Universal Resume Parser
- [x] File type detection (PDF, DOCX, TXT, RTF, HTML)
- [x] Text extraction from PDFs (with OCR fallback)
- [x] Text extraction from DOCX
- [x] Multi-column layout detection
- [x] Section detection with semantic matching
- [x] Personal Information extraction
- [x] Summary/Objective extraction
- [x] Skills extraction and grouping
- [x] Experience extraction
- [x] Projects extraction
- [x] Education extraction
- [x] Certifications extraction
- [x] Achievements/Awards extraction
- [x] Publications extraction
- [x] Languages extraction
- [x] Volunteer Experience extraction
- [ ] Profile image extraction (stub ready)

## Phase 3: Types and Interfaces
- [x] Create shared TypeScript types for Resume JSON (frontend)
- [x] Create backend type definitions

## Phase 4: Core Services
- [x] Resume Parser Service (UniversalResumeParser.js)
- [x] OCR Service (stub - tesseract.js integration)
- [x] Resume Repository (Prisma)
- [x] ATS Engine Service
- [ ] AI Tailoring Service (integrated in controller)

## Phase 5: Resume Editor API
- [x] Upload Resume endpoint
- [x] Get Resume endpoint
- [x] Update Resume endpoint (JSON only)
- [x] Tailor Resume endpoint
- [x] Download Resume endpoint (HTML, TXT, Markdown)
- [x] Delete Resume endpoint
- [x] Version History endpoints

## Phase 6: Resume Renderer
- [x] Template engine (HTML generation)
- [x] PDF Generator (stub - use html-to-pdf)
- [x] DOCX Generator (stub)
- [x] HTML Generator
- [x] Text Generator
- [x] Markdown Generator

## Phase 7: Frontend
- [x] Resume Editor component (Ant Design)
- [x] Section management (add)
- [x] ATS Score display
- [x] Template selector (stub)
- [x] Download buttons
- [ ] Drag and Drop (DND Kit integration)
- [ ] Undo/Redo

## Phase 8: Testing & Documentation
- [ ] Unit tests for parser
- [ ] Integration tests for API
- [x] Documentation (README.md)

---

## Files Created/Modified

### Backend
- `prisma/schema.prisma` - New database schema
- `services/UniversalResumeParser.js` - Universal parser with OCR
- `services/atsEngine.js` - ATS scoring engine
- `services/resumeRenderer.js` - Template-based renderer
- `repositories/resumeRepository.js` - Data access layer
- `controllers/resumeControllerV2.js` - New API controllers
- `routes/resumeV2Routes.js` - New API routes

### Frontend
- `src/types/resume.ts` - TypeScript types
- `src/services/resumeApi.ts` - API client
- `src/components/ResumeEditorV2.tsx` - Editor component
- `RESUME_ENGINE_V2_README.md` - Documentation