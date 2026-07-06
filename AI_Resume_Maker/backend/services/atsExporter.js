// ATS Resume & Cover Letter Exporter - High Quality PDF Export

import { getPool } from './postgres.js';

// Generate professional HTML resume (print-friendly)
export function generateHtmlResume(resume) {
  const data = resume.tailored || resume.parsedData || resume;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.name || 'Resume')}</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    * { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
    body { padding: 40px; color: #1e293b; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #06b6d4; padding-bottom: 16px; }
    .name { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.5px; }
    .contact { font-size: 14px; color: #64748b; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
    .contact a { color: #06b6d4; text-decoration: none; }
    .contact a:hover { text-decoration: underline; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .item { margin-bottom: 12px; }
    .item-title { font-weight: 600; color: #0f172a; }
    .item-subtitle { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { background: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .project-tech { font-size: 12px; color: #64748b; margin-top: 4px; }
    ul { margin: 5px 0; padding-left: 20px; }
    li { margin-bottom: 4px; }
    @media print { body { padding: 0; } .skill { background: #e2e8f0 !important; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(data.name || '')}</div>
    <div class="contact">
      ${data.email ? `<a href="mailto:${data.email}">${escapeHtml(data.email)}</a>` : ''}
      ${data.phone ? `<span>${escapeHtml(data.phone)}</span>` : ''}
      ${data.location ? `<span>${escapeHtml(data.location)}</span>` : ''}
      ${data.linkedin ? `<a href="${data.linkedin}">LinkedIn</a>` : ''}
      ${data.github ? `<a href="${data.github}">GitHub</a>` : ''}
    </div>
  </div>
  ${data.summary ? `<div class="section"><div class="section-title">Professional Summary</div><p>${escapeHtml(data.summary)}</p></div>` : ''}
  ${data.experience && data.experience.length > 0 ? `<div class="section"><div class="section-title">Experience</div>${data.experience.map(exp => `<div class="item"><div class="item-title">${escapeHtml(exp.title || '')}</div><div class="item-subtitle">${escapeHtml(exp.company || '')}${exp.duration ? ` | ${escapeHtml(exp.duration)}` : ''}</div><ul>${Array.isArray(exp.description) ? exp.description.map(d => `<li>${escapeHtml(d)}</li>`).join('') : (exp.description ? `<li>${escapeHtml(exp.description)}</li>` : '')}</ul></div>`).join('')}</div>` : ''}
  ${data.education && data.education.length > 0 ? `<div class="section"><div class="section-title">Education</div>${data.education.map(edu => `<div class="item"><div class="item-title">${escapeHtml(edu.degree || '')}</div><div class="item-subtitle">${escapeHtml(edu.institution || '')}${edu.duration ? ` | ${escapeHtml(edu.duration)}` : ''}</div></div>`).join('')}</div>` : ''}
  ${data.skills && data.skills.length > 0 ? `<div class="section"><div class="section-title">Skills</div><div class="skills-list">${data.skills.map(skill => `<span class="skill">${escapeHtml(skill)}</span>`).join('')}</div></div>` : ''}
  ${data.projects && data.projects.length > 0 ? `<div class="section"><div class="section-title">Projects</div>${data.projects.map(proj => `<div class="item"><div class="item-title">${escapeHtml(proj.name || '')} ${proj.technologies && proj.technologies.length ? `<span class="project-tech">(${escapeHtml(proj.technologies.join(', '))})</span>` : ''}</div><p>${escapeHtml(proj.description || '')}</p></div>`).join('')}</div>` : ''}
  ${data.certifications && data.certifications.length > 0 ? `<div class="section"><div class="section-title">Certifications</div><ul>${data.certifications.map(cert => `<li>${escapeHtml(cert)}</li>`).join('')}</ul></div>` : ''}
</body>
</html>`;
}

// Generate plain text resume for DOCX
export function generateTextResume(resume) {
  const data = resume.tailored || resume.parsedData || resume;
  
  let text = `${data.name || ''}\n`;
  text += `${data.email || ''} | ${data.phone || ''} | ${data.location || ''}\n\n`;
  
  if (data.summary) text += `PROFESSIONAL SUMMARY\n${data.summary}\n\n`;
  
  if (data.experience && data.experience.length > 0) {
    text += `EXPERIENCE\n`;
    data.experience.forEach(exp => {
      text += `${exp.title || ''} - ${exp.company || ''}${exp.duration ? ' | ' + exp.duration : ''}\n`;
      if (Array.isArray(exp.description)) exp.description.forEach(d => text += `  - ${d}\n`);
      else if (exp.description) text += `  - ${exp.description}\n`;
      text += '\n';
    });
  }
  
  if (data.education && data.education.length > 0) {
    text += `EDUCATION\n`;
    data.education.forEach(edu => text += `${edu.degree || ''} - ${edu.institution || ''}${edu.duration ? ' | ' + edu.duration : ''}\n\n`);
  }
  
  if (data.skills && data.skills.length > 0) {
    text += `SKILLS\n${data.skills.join(', ')}\n\n`;
  }
  
  if (data.projects && data.projects.length > 0) {
    text += `PROJECTS\n`;
    data.projects.forEach(proj => {
      text += `${proj.name || ''} ${proj.technologies ? '[' + proj.technologies.join(', ') + ']' : ''}\n${proj.description || ''}\n\n`;
    });
  }
  
  return text;
}

// Generate professional cover letter HTML
export function generateHtmlCoverLetter(coverLetter, company, position, resume) {
  const data = typeof coverLetter === 'string' ? { content: coverLetter } : coverLetter;
  const resumeData = resume?.parsedData || {};
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cover Letter</title>
  <style>
    @page { margin: 0.75in; size: letter; }
    body { font-family: 'Georgia', 'Times New Roman', serif; padding: 40px; color: #1e293b; line-height: 1.7; }
    .sender { margin-bottom: 30px; }
    .sender-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .sender-contact { font-size: 14px; color: #64748b; }
    .date { margin-bottom: 20px; }
    .recipient { margin-bottom: 20px; }
    .subject { font-weight: bold; margin-bottom: 20px; }
    .body { margin-bottom: 30px; white-space: pre-line; }
    .closing { margin-bottom: 40px; }
    .signature { font-weight: bold; }
  </style>
</head>
<body>
  <div class="sender">
    <div class="sender-name">${escapeHtml(resumeData.name || data.name || '')}</div>
    <div class="sender-contact">${escapeHtml(resumeData.email || '')} | ${escapeHtml(resumeData.phone || '')}</div>
  </div>
  <div class="date">${date}</div>
  <div class="recipient">${company ? `<div>${escapeHtml(company)}</div>` : ''}</div>
  ${position ? `<div class="subject">Re: Application for ${escapeHtml(position)} Position</div>` : ''}
  <div class="body">${escapeHtml(data.content || '')}</div>
  <div class="closing">Sincerely,</div>
  <div class="signature">${escapeHtml(resumeData.name || '')}</div>
</body>
</html>`;
}

// Generate plain text cover letter for DOCX
export function generateTextCoverLetter(coverLetter, company, position, resume) {
  const data = typeof coverLetter === 'string' ? { content: coverLetter } : coverLetter;
  const resumeData = resume?.parsedData || {};
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  let text = `${resumeData.name || data.name || ''}\n`;
  text += `${resumeData.email || ''} | ${resumeData.phone || ''}\n\n`;
  text += `${date}\n\n`;
  
  text += `Dear Hiring Manager,\n\n`;
  if (position) text += `Re: ${position} Position\n\n`;
  
  text += `${data.content || ''}\n\n`;
  text += `Sincerely,\n${resumeData.name || ''}\n`;
  
  return text;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

// Save export history
export async function saveExportHistory(userId, resumeId, format, tailoredResumeId) {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO "ExportHistory" ("userId", "resumeId", format, "tailoredResumeId", "createdAt")
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [userId, resumeId, format, tailoredResumeId || null]
    );
  } finally {
    client.release();
  }
}

export async function saveCoverLetterExportHistory(userId, coverLetterId, format) {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO "ExportHistory" ("userId", "coverLetterId", format, "createdAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [userId, coverLetterId, format]
    );
  } finally {
    client.release();
  }
}