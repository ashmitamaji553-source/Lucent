// src/services/text-extractor.ts
// Robust text extraction for PDF, DOCX, TXT, MD, and Images with user-facing validation

export interface ExtractedTextResult {
  text: string;
  pageCount?: number;
  charCount: number;
  mimeType: string;
}

export class TextExtractor {
  public static readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
  public static readonly SUPPORTED_EXTENSIONS = [
    '.pdf',
    '.docx',
    '.txt',
    '.md',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ];

  /**
   * Validates and extracts readable text from supported file buffers.
   */
  public async extractText(
    filename: string,
    buffer: Buffer,
    declaredMime?: string
  ): Promise<ExtractedTextResult> {
    // 1. Check file size
    if (!buffer || buffer.length === 0) {
      throw new Error(`The uploaded file "${filename}" is empty. Please check the file and try again.`);
    }

    if (buffer.length > TextExtractor.MAX_FILE_SIZE) {
      throw new Error(
        `File "${filename}" exceeds the maximum upload limit of 25MB (${(buffer.length / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller document.`
      );
    }

    // 2. Validate format
    const ext = this.getFileExtension(filename);
    if (!TextExtractor.SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(
        `Unsupported file type "${ext}" for "${filename}". Please upload a PDF, DOCX, TXT, or Image file.`
      );
    }

    let text = '';
    let pageCount: number | undefined;
    let mimeType = declaredMime || this.guessMimeType(ext);

    try {
      if (ext === '.pdf') {
        const result = await this.extractPdf(buffer, filename);
        text = result.text;
        pageCount = result.pageCount;
      } else if (ext === '.docx') {
        text = await this.extractDocx(buffer, filename);
      } else if (ext === '.txt' || ext === '.md') {
        text = buffer.toString('utf-8');
      } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        text = await this.extractImage(buffer, filename, ext);
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('The uploaded') || err.message.startsWith('Could not')) {
        throw err;
      }
      throw new Error(`Failed to extract text from "${filename}": ${err.message || 'Unknown extraction error'}`);
    }

    const cleanedText = text.replace(/\r\n/g, '\n').trim();

    if (!cleanedText || cleanedText.length === 0) {
      throw new Error(
        `The uploaded document "${filename}" contains no readable text. Please check the file and try again.`
      );
    }

    return {
      text: cleanedText,
      pageCount,
      charCount: cleanedText.length,
      mimeType,
    };
  }

  private getFileExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
  }

  private guessMimeType(ext: string): string {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.txt':
      case '.md':
        return 'text/plain';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  private async extractPdf(buffer: Buffer, filename: string): Promise<{ text: string; pageCount?: number }> {
    try {
      // Use pdf-parse library
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParseModule = require('pdf-parse');
      const PDFParse = pdfParseModule.PDFParse || pdfParseModule;

      if (typeof PDFParse === 'function' && PDFParse.prototype && PDFParse.prototype.getText) {
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        let pages: number | undefined;
        try {
          const info = await parser.getInfo();
          pages = info?.numPages || info?.pages;
        } catch {
          // ignore info error
        }
        await parser.destroy();
        return { text: textResult?.text || '', pageCount: pages };
      } else if (typeof PDFParse === 'function') {
        const res = await PDFParse(buffer);
        return { text: res.text || '', pageCount: res.numpages };
      } else {
        // Fallback simple PDF string parsing if module format differs
        const res = await PDFParse(buffer);
        return { text: res.text || '', pageCount: res.numpages };
      }
    } catch (err: any) {
      console.warn(`PDF parse error on ${filename}:`, err);
      throw new Error(
        `Could not read content from "${filename}". The PDF may be corrupted, encrypted, or password-protected.`
      );
    }
  }

  private async extractDocx(buffer: Buffer, filename: string): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err: any) {
      console.warn(`DOCX parse error on ${filename}:`, err);
      throw new Error(
        `Could not read content from "${filename}". The DOCX file may be corrupted or unreadable.`
      );
    }
  }

  private async extractImage(buffer: Buffer, filename: string, ext: string): Promise<string> {
    try {
      // Use tesseract.js for OCR
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      await worker.terminate();

      const ocrText = (ret.data?.text || '').trim();
      if (!ocrText) {
        throw new Error(
          `Could not detect readable text in "${filename}". Please ensure the image is clear and contains readable text.`
        );
      }
      return ocrText;
    } catch (err: any) {
      if (err.message && err.message.startsWith('Could not detect')) {
        throw err;
      }
      console.warn(`Image OCR error on ${filename}:`, err);
      throw new Error(
        `Could not extract text from image "${filename}". Please ensure the image is clear and legible.`
      );
    }
  }
}

export const textExtractor = new TextExtractor();
