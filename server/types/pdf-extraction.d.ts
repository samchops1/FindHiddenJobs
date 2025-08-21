declare module 'pdf-extraction' {
  interface PDFData {
    text: string;
    meta?: any;
    pages?: number;
  }
  
  function extract(buffer: Buffer): Promise<PDFData>;
  export = extract;
}