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
    console.log('Received request');
    console.log('Parsing form...');
    const { fields, files } = await parseForm(request);
    console.log('Form fields:', fields);
    console.log('Form files:', files);
    const resumeFile = files.resumeFile as File | undefined;
    const resumeText = fields.resume as string | undefined;
    const jobDescription = fields.job as string | undefined;

    console.log('Job description:', jobDescription);
    console.log('Resume text:', resumeText);

    if (!jobDescription) {
      console.log('No job description provided');
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    let finalResumeText = resumeText || '';

    // If a PDF file was uploaded, extract text from it
    if (resumeFile && 'filepath' in resumeFile) {
      console.log('PDF file detected, reading file...');
      const buffer = await readFile(resumeFile.filepath as string);
      try {
        const data = await pdfParse(buffer);
        finalResumeText = data.text;
        console.log('PDF parsed, extracted text length:', finalResumeText.length);
      } catch (error) {
        console.log('Failed to parse PDF file:', error);
        return NextResponse.json(
          { error: 'Failed to parse PDF file' },
          { status: 400 }
        );
      }
    }

    if (!finalResumeText) {
      console.log('No resume text or PDF file provided');
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

    console.log('Sending prompt to OpenAI. Prompt length:', prompt.length);
    let response;
    try {
      response = await axios.post('https://api.openai.com/v1/chat/completions', {
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
      console.log('OpenAI response received');
    } catch (err: any) {
      console.log('Error during OpenAI API call:', err.response?.status, err.response?.data || err.message);
      throw err;
    }

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.log('Invalid response from AI service:', response.data);
      throw new Error('Invalid response from AI service');
    }

    const tailored = response.data.choices[0].message.content;
    console.log('Tailored resume received, length:', tailored.length);

    // Store the original and tailored resumes in the session
    const session = request.cookies.get('session')?.value;
    if (session) {
      const sessionData = {
        originalResume: finalResumeText,
        tailoredResume: tailored
      };
      const sessionPath = join(tmpdir(), `resume-tailor-${session}.json`);
      await writeFile(sessionPath, JSON.stringify(sessionData));
      console.log('Session data written to', sessionPath);
    }

    // Return both versions for comparison
    return NextResponse.json({
      original: formatResumeForDisplay(finalResumeText),
      tailored: formatResumeForDisplay(tailored)
    });

  } catch (error: any) {
    // Improved error logging for debugging
    if (error.response) {
      console.error('OpenAI API error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message || error);
    }
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