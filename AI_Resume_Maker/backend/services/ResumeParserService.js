import { PDFParse } from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

class ResumeParserService {
  async extractTextFromPdf(filePathOrBuffer) {
    let extractedText = '';
    try {
      // Try pdf-parse first (v2.4.5 - class-based API)
      const parser = new PDFParse({ data: filePathOrBuffer });
      const textResult = await parser.getText({ first: 1, last: 999 });
      extractedText = textResult.text || textResult.join?.('') || '';
      await parser.destroy();
    } catch (error) {
      console.warn('pdf-parse failed, falling back to pdfjs-dist:', error);
      // Fallback to pdfjs-dist
      try {
        const loadingTask = pdfjsLib.getDocument(filePathOrBuffer);
        const pdf = await loadingTask.promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map(item => item.str).join(' ');
        }
      } catch (pdfjsError) {
        console.error('Error extracting text with pdfjs-dist:', pdfjsError);
        throw new Error('Failed to extract text from PDF using both parsers.');
      }
    }
    return extractedText;
  }
}

export const resumeParserService = new ResumeParserService();