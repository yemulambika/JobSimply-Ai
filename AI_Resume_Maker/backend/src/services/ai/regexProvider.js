/**
 * Regex Provider for Resume Extraction
 * A final fallback that uses regular expressions to extract basic info when all AI providers fail.
 */
export async function extractResume(resumeText) {
  console.log('Using Regex Parser...');

  const data = {
    name: "",
    email: "",
    phone: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    projects: []
  };

  if (!resumeText) return data;

  // 1. Extract Email
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emails = resumeText.match(emailRegex);
  if (emails) data.email = emails[0];

  // 2. Extract Phone
  const phoneRegex = /(\+?\d{1,3}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4})/g;
  const phones = resumeText.match(phoneRegex);
  if (phones) data.phone = phones[0];

  // 3. Extract Name (Heuristic: First non-empty line that doesn't look like an email/phone)
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (!firstLine.includes('@') && !/\d{10}/.test(firstLine)) {
      data.name = firstLine;
    }
  }

  // Helper to extract sections
  const extractSection = (sectionName) => {
    const regex = new RegExp(`(?:${sectionName})[\\s\\S]*?([\\s\\S]*?)(?=\\n(?:Experience|Education|Projects|Skills|Summary|Work History|Professional Experience)|$)`, 'i');
    const match = resumeText.match(regex);
    return match ? match[1].trim() : "";
  };

  // 4. Summary
  const summaryText = extractSection('Summary|Professional Summary|About Me');
  if (summaryText) data.summary = summaryText.trim();

  // 5. Skills
  const skillsText = extractSection('Skills|Technical Skills|Core Competencies');
  if (skillsText) {
    // Split by commas, semicolons, or newlines
    data.skills = skillsText
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 50);
  }

  // 6. Education
  const eduText = extractSection('Education|Academic Background');
  if (eduText) {
    data.education = eduText.split('\n').filter(l => l.trim().length > 0);
  }

  // 7. Experience
  const expText = extractSection('Experience|Work History|Professional Experience');
  if (expText) {
    data.experience = expText.split('\n').filter(l => l.trim().length > 0);
  }

  // 8. Projects
  const projText = extractSection('Projects|Personal Projects|Key Projects');
  if (projText) {
    data.projects = projText.split('\n').filter(l => l.trim().length > 0);
  }

  return data;
}