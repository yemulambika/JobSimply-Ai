export const RESUME_EXTRACTION_PROMPT = `Extract all information from this resume.
Return ONLY valid JSON.

Structure:
{
  "name": "",
  "email": "",
  "phone": "",
  "summary": "",
  "skills": [],
  "experience": [],
  "education": [],
  "projects": []
}

Never return markdown.`;