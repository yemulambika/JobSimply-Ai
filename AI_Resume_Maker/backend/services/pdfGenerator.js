// PDF Generator - Professional ATS Resume
// JobSimply Backend

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateResumePDF(parsedData, templateName = 'modern') {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  const margin = 50;
  const contentWidth = width - (margin * 2);
  
  // Name (larger)
  if (parsedData.name) {
    page.drawText(parsedData.name, {
      x: margin,
      y,
      size: 24,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= 30;
  }
  
  // Contact info
  const contact = [parsedData.email, parsedData.phone, parsedData.location, parsedData.linkedin, parsedData.github]
    .filter(Boolean)
    .join(' | ');
  
  if (contact) {
    page.drawText(contact, {
      x: margin,
      y,
      size: 10,
      font
    });
    y -= 20;
  }
  
  // Sections
  const sections = [
    { title: 'Experience', data: parsedData.experience },
    { title: 'Projects', data: parsedData.projects },
    { title: 'Skills', data: parsedData.skills },
    { title: 'Education', data: parsedData.education },
    { title: 'Certifications', data: parsedData.certifications }
  ];
  
  for (const section of sections) {
    if (Array.isArray(section.data) && section.data.length > 0) {
      y -= 10;
      
      // Section title
      page.drawText(section.title.toUpperCase(), {
        x: margin,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.4, 0.8)
      });
      y -= 15;
      
      // Section content
      for (const item of section.data) {
        if (y < margin + 50) break; // New page if needed
        
        let text = '';
        if (section.title === 'Experience') {
          text = `${item.title || ''} at ${item.company || ''} - ${item.duration || ''}`;
          if (item.description) text += `\n${item.description}`;
        } else if (section.title === 'Projects') {
          text = `${item.name || ''} - ${item.techStack?.join(', ') || ''}`;
          if (item.description) text += `\n${item.description}`;
        } else if (section.title === 'Skills') {
          text = Array.isArray(item) ? item.join(', ') : item;
        } else {
          text = item.degree || item.name || '';
        }
        
        page.drawText(text, {
          x: margin,
          y,
          size: 10,
          font
        });
        y -= 15;
      }
    }
  }
  
  // Skills as comma-separated string
  if (Array.isArray(parsedData.skills)) {
    const skillsText = parsedData.skills.join(', ');
    page.drawText(skillsText, {
      x: margin,
      y: y - 10,
      size: 10,
      font
    });
  }
  
  return await pdfDoc.saveAsBase64();
}

export async function generateCoverLetterPDF(content) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const lines = content.split('\n');
  let y = 750;
  
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: 11,
      font
    });
    y -= 15;
  }
  
  return await pdfDoc.saveAsBase64();
}