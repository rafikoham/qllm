export interface ParsedDocument {
    content: string;
    metadata: {
      filename: string;
      fileType: string;
      parseDate: Date;
      size: number;
    };
  }
  
  export interface ParserOptions {
    encoding?: string;
    preserveFormatting?: boolean;
    extractMetadata?: boolean;
  }