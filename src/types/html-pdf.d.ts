declare module 'html-pdf' {
  interface Options {
    format?: string;
    border?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }

  interface PDF {
    create(html: string, options?: Options): {
      toBuffer(callback: (err: Error | null, buffer: Buffer) => void): void;
    };
  }

  const pdf: PDF;
  export default pdf;
} 