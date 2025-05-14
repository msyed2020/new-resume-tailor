import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import pdf from 'html-pdf';

export async function POST(request: NextRequest) {
  try {
    const session = await request.cookies.get('session')?.value;
    if (!session) {
      return NextResponse.json(
        { error: 'No session found. Please generate a resume first.' },
        { status: 400 }
      );
    }

    // Read the session data from the temporary file
    const sessionPath = join(tmpdir(), `resume-tailor-${session}.json`);
    let sessionData;
    try {
      const fileContent = await readFile(sessionPath, 'utf-8');
      sessionData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { error: 'No tailored resume found. Please generate one first.' },
        { status: 400 }
      );
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 2rem; }
            h1, h2, h3 { color: #2d3748; }
            ul { margin: 1rem 0; }
            li { margin: 0.5rem 0; }
          </style>
        </head>
        <body>
          <pre style="white-space: pre-wrap;">${sessionData.tailoredResume}</pre>
        </body>
      </html>
    `;

    // Generate PDF
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      pdf.create(html, {
        format: 'Letter',
        border: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        }
      }).toBuffer((err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    // Clean up the session file
    try {
      await unlink(sessionPath);
    } catch (error) {
      console.error('Error cleaning up session file:', error);
    }

    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=tailored-resume.pdf'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 