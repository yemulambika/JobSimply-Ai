export const RESUME_EXTRACTION_PROMPT = `Extract ALL information from this resume.
Return ONLY valid JSON with this exact structure:

{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "address": "",
    "city": "",
    "country": ""
  },
  "summary": "",
  "skills": {
    "programming": [],
    "frontend": [],
    "backend": [],
    "frameworks": [],
    "database": [],
    "cloud": [],
    "devops": [],
    "ai": [],
    "ml": [],
    "dataScience": [],
    "mobile": [],
    "testing": [],
    "tools": [],
    "soft": [],
    "other": []
  },
  "education": [
    {
      "degree": "",
      "specialization": "",
      "college": "",
      "university": "",
      "location": "",
      "cgpa": "",
      "percentage": "",
      "startYear": "",
      "endYear": "",
      "current": false,
      "description": ""
    }
  ],
  "experience": [
    {
      "company": "",
      "designation": "",
      "employmentType": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "duration": "",
      "description": "",
      "bullets": [],
      "technologies": []
    }
  ],
  "internships": [],
  "projects": [
    {
      "title": "",
      "description": "",
      "responsibilities": [],
      "features": [],
      "technologies": [],
      "github": "",
      "deployment": "",
      "demo": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "provider": "",
      "issueDate": "",
      "expiry": "",
      "credentialId": "",
      "credentialUrl": ""
    }
  ],
  "achievements": [],
  "languages": [],
  "links": {
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "website": "",
    "gfg": "",
    "scaler": "",
    "medium": "",
    "hashnode": "",
    "devto": "",
    "kaggle": "",
    "stackoverflow": "",
    "leetcode": "",
    "codeforces": "",
    "codechef": "",
    "behance": "",
    "dribbble": "",
    "gitlab": "",
    "bitbucket": "",
    "twitter": "",
    "other": []
  },
  "customSections": [
    {
      "title": "",
      "content": ""
    }
  ],
  "publications": [],
  "research": [],
  "volunteering": [],
  "leadership": []
}

Rules:
- Extract EVERY section present in the resume
- If a section is not present, return empty array/object
- For custom sections (Volunteer, Research, Awards, Hackathons, Publications, Patents, Hobbies, Interests, Leadership, Training, Workshops, Open Source), add them to customSections array
- Never discard any information
- Never return markdown
- Return ONLY the JSON object`