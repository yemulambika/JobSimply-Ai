// ============================================================
// RESUME ENGINE V2 - SHARED TYPES
// ============================================================

/**
 * Personal Information
 */
export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  portfolio?: string;
  website?: string;
  linkedin?: string;
  github?: string;
}

/**
 * Experience Entry
 */
export interface ExperienceEntry {
  company: string;
  designation: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Freelance';
  location?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  duration?: string;
  description?: string;
  bullets: string[];
  technologies: string[];
}

/**
 * Education Entry
 */
export interface EducationEntry {
  degree: string;
  specialization?: string;
  college?: string;
  university?: string;
  location?: string;
  cgpa?: string;
  percentage?: string;
  startYear?: string;
  endYear?: string;
  current: boolean;
  description?: string;
}

/**
 * Project Entry
 */
export interface ProjectEntry {
  title: string;
  description?: string;
  responsibilities?: string[];
  features?: string[];
  technologies: string[];
  github?: string;
  deployment?: string;
  demo?: string;
}

/**
 * Certification Entry
 */
export interface CertificationEntry {
  name: string;
  provider?: string;
  issueDate?: string;
  expiry?: string;
  credentialId?: string;
  credentialUrl?: string;
}

/**
 * Achievement Entry
 */
export interface AchievementEntry {
  title: string;
  description?: string;
  date?: string;
  issuer?: string;
}

/**
 * Publication Entry
 */
export interface PublicationEntry {
  title: string;
  description?: string;
  date?: string;
  publisher?: string;
}

/**
 * Research Entry
 */
export interface ResearchEntry {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  institution?: string;
  technologies?: string[];
}

/**
 * Volunteer Entry
 */
export interface VolunteerEntry {
  title: string;
  description?: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  url?: string;
}

/**
 * Custom Section Entry
 */
export interface CustomSectionEntry {
  title: string;
  content: string;
}

/**
 * Link Collection
 */
export interface Links {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  gfg?: string;
  scaler?: string;
  medium?: string;
  hashnode?: string;
  devto?: string;
  kaggle?: string;
  stackoverflow?: string;
  leetcode?: string;
  codeforces?: string;
  codechef?: string;
  behance?: string;
  dribbble?: string;
  gitlab?: string;
  bitbucket?: string;
  twitter?: string;
  other?: string[];
}

/**
 * Skills (Categorized)
 */
export interface Skills {
  programming: string[];
  frontend: string[];
  backend: string[];
  frameworks: string[];
  database: string[];
  cloud: string[];
  devops: string[];
  ai: string[];
  ml: string[];
  dataScience: string[];
  mobile: string[];
  testing: string[];
  tools: string[];
  soft: string[];
  other: string[];
}

/**
 * Complete Resume JSON Structure
 * This is THE SOURCE OF TRUTH
 */
export interface ResumeJSON {
  personalInfo: PersonalInfo;
  summary: string;
  objective: string;
  skills: Skills;
  experience: ExperienceEntry[];
  internships: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  publications: PublicationEntry[];
  research: ResearchEntry[];
  volunteering: VolunteerEntry[];
  leadership: CustomSectionEntry[];
  languages: string[];
  links: Links;
  customSections: CustomSectionEntry[];
  // Parser metadata
  rawText?: string;
  parserVersion?: string;
  extractionConfidence?: number;
  profileImage?: string;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface UploadResumeRequest {
  title?: string;
  file: Buffer;
}

export interface UploadResumeResponse {
  resumeId: number;
  fileUrl?: string;
  resumeJSON: ResumeJSON;
}

export interface UpdateResumeRequest {
  resumeJSON: Partial<ResumeJSON>;
}

export interface TailorResumeRequest {
  resumeId: number;
  jobId?: number;
  jobDescription?: string;
  selectedSections?: string[];
  selectedKeywords?: string[];
  tone?: 'professional' | 'concise' | 'detailed' | 'casual';
  optimizationLevel?: 'conservative' | 'balanced' | 'aggressive';
}

export interface TailorResumeResponse {
  tailoredResumeId: number;
  resumeJSON: ResumeJSON;
  atsScore: number;
  matchScore: number;
  changes: string[];
}

export interface DownloadResumeRequest {
  resumeId: number;
  format: 'pdf' | 'docx' | 'html' | 'txt' | 'markdown';
  useTailored?: boolean;
}

export interface VersionHistoryEntry {
  id: number;
  version: number;
  changeNote?: string;
  createdAt: string;
}