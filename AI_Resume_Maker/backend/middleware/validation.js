import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Job extraction schema
export const jobExtractionSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  salary: z.string().optional(),
  experience: z.string().optional(),
  employmentType: z.string().optional(),
  workMode: z.string().optional(),
  description: z.string().optional(),
  responsibilities: z.string().optional(),
  qualifications: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  source: z.string().optional(),
  jobUrl: z.string().optional(),
  companyLogo: z.string().optional(),
  postedDate: z.string().optional(),
});

// Resume upload
export const resumeUploadSchema = z.object({
  title: z.string().optional(),
});

// Cover letter generation
export const coverLetterSchema = z.object({
  jobId: z.number().positive('Job ID must be a positive number').optional(),
  jobTitle: z.string().min(1, 'Job title is required').optional(),
  companyName: z.string().min(1, 'Company name is required').optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic']).optional(),
});

// Tailor / resume generation
export const tailorSchema = z.object({
  resumeId: z.number().positive('Resume ID must be a positive number'),
  jobId: z.number().positive('Job ID must be a positive number'),
  options: z.object({
    reorderSkills: z.boolean().optional(),
    rewordBullets: z.boolean().optional(),
    updateSummary: z.boolean().optional(),
  }).optional(),
});

export const tailorCustomSchema = z.object({
  resumeId: z.number().positive('Resume ID must be a positive number'),
  jobId: z.number().positive('Job ID must be a positive number'),
  selectedSections: z.array(z.string()).min(1, 'Select at least one section'),
  selectedKeywords: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'concise', 'detailed']).optional(),
  length: z.enum(['brief', 'standard', 'detailed']).optional(),
  optimizationLevel: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
});

/**
 * Middleware helper: validate req.body against a Zod schema.
 * On failure, returns 400 with the project's structured error format.
 * On success, attaches validated data to req.validated and calls next().
 */
export function validateBody(schema) {
  return (req, res, next) => {
    console.log('[VALIDATION] ========== validateBody START ==========');
    console.log('[VALIDATION] req.body:', JSON.stringify(req.body).substring(0, 500));
    try {
      const parsed = schema.parse(req.body || {});
      req.validated = parsed;
      console.log('[VALIDATION] Validation PASSED, fields:', Object.keys(parsed));
      next();
    } catch (err) {
      console.log('[VALIDATION] Validation FAILED:', err.message);
      if (err instanceof z.ZodError) {
        const fieldErrors = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || 'body';
          fieldErrors[key] = issue.message;
        }
        return res.status(400).json({
          success: false,
          stage: 'validation',
          error: 'Invalid request body',
          details: fieldErrors,
        });
      }
      return res.status(400).json({
        success: false,
        stage: 'validation',
        error: 'Validation failed',
      });
    }
  };
}
