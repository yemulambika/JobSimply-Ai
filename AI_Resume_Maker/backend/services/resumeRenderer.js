// ============================================================
// RESUME RENDERER V2
// Generates: HTML, PDF, DOCX, TXT, Markdown from Resume JSON
// Template-based rendering
// ============================================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Template definitions
const TEMPLATES = {
  modern: {
    name: 'Modern',
    fontFamily: 'Inter, sans-serif',
    colors: { primary: '#2563eb', secondary: '#1e293b' },
  },
  professional: {
    name: 'Professional',
    fontFamily: 'Georgia, serif',
    colors: { primary: '#059669', secondary: '#111827' },
  },
  minimalist: {
    name: 'Minimalist',
    fontFamily: 'Helvetica, Arial, sans-serif',
    colors: { primary: '#374151', secondary: '#111827' },
  },
  creative: {
    name: 'Creative',
    fontFamily: 'Poppins, sans-serif',
    colors: { primary: '#7c3aed', secondary: '#1e293b' },
  },
  technical: {
    name: 'Technical',
    fontFamily: 'JetBrains Mono, monospace',
    colors: { primary: '#0f172a', secondary: '#334155' },
  },
};

/**
 * Render resume to HTML
 */
function renderToHtml(resumeJSON, template = 'modern') {
  const tpl = TEMPLATES[template] || TEMPLATES.modern;
  const { personalInfo, summary, experience, education, projects, skills, certifications, achievements } = resumeJSON;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${personalInfo?.name || 'Resume'} - ${tpl.name} Template</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${tpl.fontFamily}; color: ${tpl.colors.secondary}; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid ${tpl.colors.primary}; padding-bottom: 20px; margin-bottom: 20px; }
    .name { font-size: 28px; font-weight: 700; color: ${tpl.colors.primary}; margin-bottom: 5px; }
    .contact { display: flex; gap: 15px; font-size: 14px; color: #64748b; flex-wrap: wrap; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 18px; font-weight: 600; color: ${tpl.colors.primary}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .section-content { margin-left: 10px; }
    .entry { margin-bottom: 15px; }
    .entry-title { font-weight: 600; margin-bottom: 3px; }
    .entry-subtitle { color: #64748b; font-size: 14px; margin-bottom: 5px; }
    .bullets { margin-top: 5px; padding-left: 20px; }
    .bullets li { margin-bottom: 3px; font-size: 14px; }
    .skills-grid { display: flex; gap: 10px; flex-wrap: wrap; }
    .skill-tag { background: ${tpl.colors.primary}20; color: ${tpl.colors.primary}; padding: 5px 12px; border-radius: 20px; font-size: 12px; }
    a { color: ${tpl.colors.primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="name">${personalInfo?.name || ''}</h1>
    <div class="contact">
      ${personalInfo?.email ? `<span>${personalInfo.email}</span>` : ''}
      ${personalInfo?.phone ? `<span>${personalInfo.phone}</span>` : ''}
      ${personalInfo?.location ? `<span>${personalInfo.location}</span>` : ''}
      ${personalInfo?.linkedin ? `<a href="${personalInfo.linkedin}">LinkedIn</a>` : ''}
      ${personalInfo?.github ? `<a href="${personalInfo.github}">GitHub</a>` : ''}
    </div>
  </div>
  
  ${summary ? `
  <div class="section">
    <h2 class="section-title">Professional Summary</h2>
    <p class="section-content">${summary}</p>
  </div>` : ''}
  
  ${experience?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Experience</h2>
    ${experience.map(exp => `
    <div class="entry">
      <div class="entry-title">${exp.designation || ''}</div>
      <div class="entry-subtitle">${exp.company || ''} • ${exp.duration || ''} ${exp.current ? '(Current)' : ''}</div>
      ${exp.bullets?.length > 0 ? `<ul class="bullets">${exp.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}
  </div>` : ''}
  
  ${education?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Education</h2>
    ${education.map(edu => `
    <div class="entry">
      <div class="entry-title">${edu.degree || ''}</div>
      <div class="entry-subtitle">${edu.college || edu.university || ''} • ${edu.endYear || ''}</div>
      ${edu.cgpa ? `<div>CGPA: ${edu.cgpa}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}
  
  ${skills ? `
  <div class="section">
    <h2 class="section-title">Skills</h2>
    <div class="skills-grid">
      ${Object.entries(skills).flatMap(([category, items]) => 
        items?.map(s => `<span class="skill-tag">${s}</span>`).join('') || []
      ).join('')}
    </div>
  </div>` : ''}
  
  ${projects?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Projects</h2>
    ${projects.map(proj => `
    <div class="entry">
      <div class="entry-title">${proj.title || ''}</div>
      ${proj.description ? `<p>${proj.description}</p>` : ''}
      ${proj.technologies?.length > 0 ? `<div>Tech: ${proj.technologies.join(', ')}</div>` : ''}
      ${proj.github ? `<a href="${proj.github}">GitHub</a>` : ''}
    </div>`).join('')}
  </div>` : ''}
  
  ${certifications?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Certifications</h2>
    ${certifications.map(cert => `
    <div class="entry">
      <div class="entry-title">${cert.name || ''}</div>
      ${cert.provider ? `<div class="entry-subtitle">${cert.provider}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}
  
  ${achievements?.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Achievements</h2>
    ${achievements.map(ach => `<div class="entry">${ach.title || ''}</div>`).join('')}
  </div>` : ''}
</body>
</html>`;
}

/**
 * Render resume to Markdown
 */
function renderToMarkdown(resumeJSON) {
  const { personalInfo, summary, experience, education, projects, skills } = resumeJSON;
  
  let md = '';
  
  // Header
  md += `# ${personalInfo?.name || 'Name'}\n\n`;
  md += `**Contact:** ${personalInfo?.email || ''} | ${personalInfo?.phone || ''} | ${personalInfo?.location || ''}\n\n`;
  
  // Summary
  if (summary) {
    md += `## Professional Summary\n${summary}\n\n`;
  }
  
  // Experience
  if (experience?.length > 0) {
    md += `## Experience\n\n`;
    for (const exp of experience) {
      md += `**${exp.designation}** at ${exp.company || ''}\n`;
      md += `${exp.duration || ''}\n\n`;
      if (exp.bullets?.length > 0) {
        for (const bullet of exp.bullets) {
          md += `- ${bullet}\n`;
        }
        md += '\n';
      }
    }
  }
  
  // Education
  if (education?.length > 0) {
    md += `## Education\n\n`;
    for (const edu of education) {
      md += `**${edu.degree}** - ${edu.college || edu.university || ''}\n`;
      md += `${edu.endYear || ''}\n\n`;
    }
  }
  
  // Skills
  if (skills) {
    md += `## Skills\n\n`;
    for (const [category, items] of Object.entries(skills)) {
      if (items?.length > 0) {
        md += `- **${category}:** ${items.join(', ')}\n`;
      }
    }
    md += '\n';
  }
  
  // Projects
  if (projects?.length > 0) {
    md += `## Projects\n\n`;
    for (const proj of projects) {
      md += `**${proj.title}**\n`;
      if (proj.description) md += `${proj.description}\n`;
      if (proj.technologies?.length > 0) md += `*Tech:* ${proj.technologies.join(', ')}\n`;
      md += '\n';
    }
  }
  
  return md;
}

/**
 * Render resume to plain text
 */
function renderToText(resumeJSON) {
  const { personalInfo, summary, experience, education, projects, skills } = resumeJSON;
  
  let text = '';
  
  // Header
  text += `${personalInfo?.name || 'Name'}\n`;
  text += `${'='.repeat(40)}\n`;
  text += `Email: ${personalInfo?.email || ''}\n`;
  text += `Phone: ${personalInfo?.phone || ''}\n`;
  text += `Location: ${personalInfo?.location || ''}\n\n`;
  
  // Summary
  if (summary) {
    text += `PROFESSIONAL SUMMARY\n${'-'.repeat(20)}\n`;
    text += `${summary}\n\n`;
  }
  
  // Experience
  if (experience?.length > 0) {
    text += `EXPERIENCE\n${'-'.repeat(20)}\n`;
    for (const exp of experience) {
      text += `${exp.designation} at ${exp.company}\n`;
      text += `${exp.duration}\n`;
      if (exp.bullets?.length > 0) {
        for (const bullet of exp.bullets) {
          text += `  - ${bullet}\n`;
        }
      }
      text += '\n';
    }
  }
  
  // Education
  if (education?.length > 0) {
    text += `EDUCATION\n${'-'.repeat(20)}\n`;
    for (const edu of education) {
      text += `${edu.degree} - ${edu.college || edu.university}\n`;
      text += `${edu.endYear}\n\n`;
    }
  }
  
  // Skills
  if (skills) {
    text += `SKILLS\n${'-'.repeat(20)}\n`;
    for (const [category, items] of Object.entries(skills)) {
      if (items?.length > 0) {
        text += `${category}: ${items.join(', ')}\n`;
      }
    }
    text += '\n';
  }
  
  // Projects
  if (projects?.length > 0) {
    text += `PROJECTS\n${'-'.repeat(20)}\n`;
    for (const proj of projects) {
      text += `${proj.title}\n`;
      if (proj.description) text += `${proj.description}\n`;
      if (proj.technologies?.length > 0) text += `Technologies: ${proj.technologies.join(', ')}\n`;
      text += '\n';
    }
  }
  
  return text;
}

/**
 * Render resume to PDF using jsPDF
 */
async function renderToPdf(resumeJSON, template = 'modern') {
  const html = renderToHtml(resumeJSON, template);
  
  // Create PDF from HTML
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // For proper PDF generation, we'd need html2canvas which works in browser
  // In Node.js, we'll use a simpler approach with jsPDF text methods
  // This is a simplified version - production would use puppeteer/html2pdf
  
  try {
    // @ts-ignore - html2canvas-node might be used in production
    const canvas = await html2canvas(html);
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 0, 0, 210, 297);
  } catch (e) {
    // Fallback: generate simple text-based PDF
    const text = renderToText(resumeJSON);
    doc.setFontSize(12);
    doc.text(text, 10, 10);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Render resume to DOCX (simplified - would use docx library in production)
 */
function renderToDocx(resumeJSON) {
  // In production, use the 'docx' npm package
  // For now, return markdown as it can be easily converted
  const md = renderToMarkdown(resumeJSON);
  
  // Placeholder for DOCX generation
  // Would return actual DOCX buffer using docx library
  return Buffer.from(md);
}

// Export functions
export {
  renderToHtml,
  renderToMarkdown,
  renderToText,
  renderToPdf,
  renderToDocx,
  TEMPLATES,
};