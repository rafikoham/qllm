
export interface DocumentParser {
  parse(buffer: Buffer, filename: string): Promise<string>;
  supports(filename: string): boolean;
}

export class TextParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.txt');
  }

  async parse(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }
}

export class JSONParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.json');
  }

  async parse(buffer: Buffer): Promise<string> {
    const content = JSON.parse(buffer.toString('utf-8'));
    return JSON.stringify(content, null, 2);
  }
}

export class YAMLParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.yml') || filename.endsWith('.yaml');
  }

  async parse(buffer: Buffer): Promise<string> {
    const yaml = require('js-yaml');
    const content = yaml.load(buffer.toString('utf-8'));
    return yaml.dump(content);
  }
}

export class PDFParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.pdf');
  }

  async parse(buffer: Buffer, filename:string): Promise<string> { 
    const fs = require('fs').promises;
    const pdf = require('pdf-parse');
    const pdfBuffer = await fs.readFile(filename);
    const pdfData = await pdf(pdfBuffer);
    const markdownContent = pdfData.text;
    return markdownContent
  }
}

export class DocxParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.docx');
  }

  async parse(buffer: Buffer): Promise<string> {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

export class ExcelParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.xlsx') || filename.endsWith('.xls');
  }

  async parse(buffer: Buffer): Promise<string> {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let result = '';
    
    workbook.SheetNames.forEach((sheetName:any) => {
      const sheet = workbook.Sheets[sheetName];
      result += `Sheet: ${sheetName}\n`;
      result += XLSX.utils.sheet_to_csv(sheet);
      result += '\n\n';
    });
    
    return result;
  }
}

export class CSVParser implements DocumentParser {
  supports(filename: string): boolean {
    return filename.endsWith('.csv');
  }

  async parse(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }
}