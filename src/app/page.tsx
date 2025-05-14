'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState<{ original: string; tailored: string } | null>(null);
  const [fileName, setFileName] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size too large. Maximum size is 5MB.');
        return;
      }
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      setFileName(file.name);
      setResumeText('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName && !resumeText.trim()) {
      setError('Please either upload a PDF file or paste your resume text.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please enter a job description.');
      return;
    }

    setIsLoading(true);
    setError('');
    setComparison(null);

    try {
      const formData = new FormData();
      if (fileName) {
        const file = (document.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0];
        if (file) formData.append('resumeFile', file);
      } else {
        formData.append('resume', resumeText);
      }
      formData.append('job', jobDescription);

      const response = await axios.post('/api/generate', formData);
      setComparison(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate resume');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      const response = await axios.post('/api/accept', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'tailored-resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Failed to download PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      <header className="text-center py-12 bg-white/80 shadow-sm">
        <h1 className="text-5xl font-extrabold text-indigo-700 mb-3 tracking-tight drop-shadow-sm">Resume Tailor</h1>
        <p className="text-lg text-gray-600 font-medium">Supercharge your resume for your dream job with AI</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8 border border-indigo-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                Upload or Paste Your Resume
                <span className="text-xs text-gray-500 ml-2">(PDF or text)</span>
              </label>
              <div className="mb-4">
                <div {...getRootProps()} className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200 ${
                  isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-indigo-50'
                }`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-12 h-12 text-indigo-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-base text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PDF only (MAX. 5MB)</p>
                  </div>
                </div>
                {fileName && (
                  <div className="mt-2 text-sm text-indigo-700 flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{fileName}</span>
                    <button
                      type="button"
                      onClick={() => setFileName('')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-indigo-400 focus:border-indigo-400 text-base bg-gray-50 placeholder-gray-400 text-gray-800"
                  placeholder="Or paste your resume text here..."
                />
                <div className="absolute top-2 right-4 text-xs text-gray-400">
                  {resumeText.length} characters
                </div>
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                Job Description
                <span className="text-xs text-gray-500 ml-2">(Paste the job description you're applying for)</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-indigo-400 focus:border-indigo-400 text-base bg-gray-50 placeholder-gray-400 text-gray-800"
                required
                placeholder="Paste the job description here..."
              />
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-semibold rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 disabled:opacity-60 transition-all"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Optimizing your resume...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Tailored Resume
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-8 p-4 bg-red-100 text-red-800 rounded-lg flex items-center shadow-sm">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {comparison && (
            <div className="mt-10">
              <h3 className="text-2xl font-bold text-indigo-700 mb-6 text-center">See Your Resume Transformation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-xl p-6 bg-gray-50 shadow-sm">
                  <h4 className="font-semibold text-gray-700 mb-3 text-center">Original Resume</h4>
                  <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: comparison.original }} />
                </div>
                <div className="border rounded-xl p-6 bg-green-50 shadow-sm">
                  <h4 className="font-semibold text-green-700 mb-3 text-center">Tailored Resume</h4>
                  <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: comparison.tailored }} />
                </div>
              </div>
              <div className="mt-6 flex justify-center space-x-4">
                <button
                  onClick={handleAccept}
                  className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={() => setComparison(null)}
                  className="inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-400 text-base pb-6">
        <p>✨ Powered by AI to help you land your dream job ✨</p>
      </footer>
    </div>
  );
}
