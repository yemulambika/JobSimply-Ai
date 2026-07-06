import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

async function testPdfParse(buffer) {
  try {
    console.log('Testing pdf-parse...');
    const data = await pdfParse(buffer);
    console.log('pdf-parse successful! Length of text:', data.text.length);
    console.log('Text preview:', data.text.substring(0, 100));
    return data.text;
  } catch (error) {
    console.error('pdf-parse failed:', error);
    throw error;
  }
}

async function testPdfJs(buffer) {
  try {
    console.log('Testing pdfjs-dist...');
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    console.log('pdfjs-dist loaded document. Pages:', pdf.numPages);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    console.log('pdfjs-dist successful! Length of text:', fullText.length);
    console.log('Text preview:', fullText.substring(0, 100));
    return fullText;
  } catch (error) {
    console.error('pdfjs-dist failed:', error);
    throw error;
  }
}

async function main() {
  const filePath = path.join(process.cwd(), 'uploads', 'sample.pdf');
  const buffer = fs.readFileSync(filePath);
  
  try {
    await testPdfParse(buffer);
  } catch (err) {
    console.log('pdf-parse threw an error, calling fallback...');
  }
  
  try {
    await testPdfJs(buffer);
  } catch (err) {
    console.log('pdfjs-dist fallback failed too.');
  }
}

main();
