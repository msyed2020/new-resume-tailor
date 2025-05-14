import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import formidable, { File as FormidableFile } from 'formidable';
import { Readable } from 'stream';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseForm(req: any): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse the form using formidable
    const { fields, files } = await parseForm(request);
    const resumeFile = files.resumeFile as File | undefined;
    const resumeText = fields.resume as string | undefined;
    const jobDescription = fields.job as string | undefined;

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    let finalResumeText = resumeText || '';

    // If a PDF file was uploaded, extract text from it
    if (resumeFile && 'filepath' in resumeFile) {
      const buffer = await readFile(resumeFile.filepath as string);
      try {
        const data = await pdfParse(buffer);
        finalResumeText = data.text;
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to parse PDF file' },
          { status: 400 }
        );
      }
    }

    if (!finalResumeText) {
      return NextResponse.json(
        { error: 'Resume text or PDF file is required' },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert resume writer. Please modify the following resume to better fit the job description using relevant keywords and experiences.

Resume:
${finalResumeText}

Job Description:
${jobDescription}

Return the improved resume in professional formatting (bullet points, spacing, etc).
`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response from AI service');
    }

    const tailored = response.data.choices[0].message.content;

    // Store the original and tailored resumes in the session
    const session = request.cookies.get('session')?.value;
    if (session) {
      // Store in a temporary file since we can't use express-session
      const sessionData = {
        originalResume: finalResumeText,
        tailoredResume: tailored
      };
      const sessionPath = join(tmpdir(), `resume-tailor-${session}.json`);
      await writeFile(sessionPath, JSON.stringify(sessionData));
    }

    // Return both versions for comparison
    return NextResponse.json({
      original: formatResumeForDisplay(finalResumeText),
      tailored: formatResumeForDisplay(tailored)
    });

  } catch (error: any) {
    console.error('Error:', error);
    let errorMessage = 'Failed to generate tailored resume. ';
    
    if (error.response?.data?.error) {
      errorMessage += error.response.data.error;
    } else if (error.response?.status === 401) {
      errorMessage += 'Authentication failed. Please check your API key.';
    } else if (error.response?.status === 429) {
      errorMessage += 'Rate limit exceeded. Please try again later.';
    } else {
      errorMessage += 'Please try again later.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to format resume text for display
function formatResumeForDisplay(text: string) {
  // Convert line breaks to <br> tags
  return text.replace(/\n/g, '<br>');
} 