// ============================================================
// RESUME ENGINE V2 - FRONTEND TYPES
// ============================================================

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

export interface CertificationEntry {
  name: string;
  provider?: string;
  issueDate?: string;
  expiry?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface AchievementEntry {
  title: string;
  description?: string;
  date?: string;
  issuer?: string;
}

export interface Links {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  other?: string[];
}

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

export interface CustomSectionEntry {
  title: string;
  content: string;
}

// Main Resume JSON type - THIS IS THE SOURCE OF TRUTH
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
  publications: CustomSectionEntry[];
  research: CustomSectionEntry[];
  volunteering: CustomSectionEntry[];
  leadership: CustomSectionEntry[];
  languages: string[];
  links: Links;
  customSections: CustomSectionEntry[];
  rawText?: string;
  parserVersion?: string;
  extractionConfidence?: number;
  profileImage?: string;
}

// API Response types
export interface ResumeResponse {
  id: number;
  title: string;
  template: string;
  status: string;
  fileUrl?: string;
  resumeJSON: ResumeJSON;
  tailoredResumeJSON?: ResumeJSON;
  atsScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResumeResponse {
  success: boolean;
  resumeId: number;
  resumeJSON: ResumeJSON;
  atsScore: number;
  fileUrl?: string;
}

export interface TailorResumeResponse {
  success: boolean;
  tailoredResumeId: number;
  resumeJSON: ResumeJSON;
  atsScore: number;
  matchScore: number;
}