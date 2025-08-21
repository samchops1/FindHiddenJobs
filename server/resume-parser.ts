import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ResumeAnalysis {
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  keywords: string[];
  suggestedJobTitles: string[];
  experienceLevel: string;
}

export class ResumeParser {
  /**
   * Parse and analyze a resume file using OpenAI
   */
  async parseResume(filePath: string, fileName: string): Promise<ResumeAnalysis> {
    try {
      console.log(`📄 Parsing resume: ${fileName}`);
      
      // Extract text from the file
      const resumeText = await this.extractTextFromFile(filePath, fileName);
      
      if (!resumeText || resumeText.length < 50) {
        throw new Error('Could not extract readable text from resume');
      }
      
      console.log(`✅ Extracted ${resumeText.length} characters from resume`);
      
      // Analyze the resume text with OpenAI
      const analysis = await this.analyzeWithOpenAI(resumeText);
      
      return analysis;
    } catch (error) {
      console.error('❌ Resume parsing failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF, DOC, or DOCX files
   */
  private async extractTextFromFile(filePath: string, fileName: string): Promise<string> {
    const fileExtension = path.extname(fileName).toLowerCase();
    
    try {
      if (fileExtension === '.pdf') {
        // Parse PDF
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text;
      } else if (fileExtension === '.docx' || fileExtension === '.doc') {
        // For DOC/DOCX files, we'll try to read as text
        // In production, you might want to use a library like mammoth
        const buffer = fs.readFileSync(filePath);
        return buffer.toString('utf8');
      } else {
        // Try to read as plain text
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error(`Failed to extract text from ${fileExtension} file`);
    }
  }

  /**
   * Analyze resume text using OpenAI GPT
   */
  private async analyzeWithOpenAI(resumeText: string): Promise<ResumeAnalysis> {
    try {
      const prompt = `
Analyze the following resume and extract structured information. Return a JSON object with the exact structure shown below.

Resume Text:
${resumeText}

Please return a JSON object with this exact structure (no additional text or formatting):

{
  "skills": ["JavaScript", "React", "Node.js"],
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Tech Corp",
      "duration": "2021-2023",
      "description": "Brief description of role and achievements"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "school": "University Name",
      "year": "2021"
    }
  ],
  "keywords": ["javascript", "react", "nodejs"],
  "suggestedJobTitles": ["Software Engineer", "Full Stack Developer", "Frontend Developer"],
  "experienceLevel": "mid-level"
}

Guidelines:
- Extract all technical skills, programming languages, frameworks, and tools
- List work experience in reverse chronological order
- Include education history
- Generate keywords from skills and job titles (lowercase)
- Suggest 3-5 relevant job titles based on skills and experience
- Determine experience level: "entry-level", "mid-level", "senior", "executive"
- Keep descriptions concise (under 100 characters each)
- If information is missing, use empty arrays or "Not specified"
      `.trim();

      console.log('🤖 Sending resume to OpenAI for analysis...');
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using the cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume analyzer. Return only valid JSON with the requested structure. Do not include any text before or after the JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent results
      });

      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      console.log('✅ Received analysis from OpenAI');
      
      // Parse the JSON response
      let analysis: ResumeAnalysis;
      try {
        analysis = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.log('AI Response:', aiResponse);
        throw new Error('Invalid JSON response from AI');
      }

      // Validate and sanitize the response
      const sanitizedAnalysis: ResumeAnalysis = {
        skills: Array.isArray(analysis.skills) ? analysis.skills.slice(0, 20) : [],
        experience: Array.isArray(analysis.experience) ? analysis.experience.slice(0, 10) : [],
        education: Array.isArray(analysis.education) ? analysis.education.slice(0, 5) : [],
        keywords: Array.isArray(analysis.keywords) ? analysis.keywords.slice(0, 30) : [],
        suggestedJobTitles: Array.isArray(analysis.suggestedJobTitles) ? analysis.suggestedJobTitles.slice(0, 10) : [],
        experienceLevel: ['entry-level', 'mid-level', 'senior', 'executive'].includes(analysis.experienceLevel) 
          ? analysis.experienceLevel 
          : 'mid-level'
      };

      console.log(`📊 Analysis complete: ${sanitizedAnalysis.skills.length} skills, ${sanitizedAnalysis.experience.length} experiences`);
      
      return sanitizedAnalysis;
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      
      // Return a basic analysis if OpenAI fails
      const fallbackAnalysis: ResumeAnalysis = {
        skills: ['Communication', 'Problem Solving', 'Teamwork'],
        experience: [],
        education: [],
        keywords: ['communication', 'problem', 'solving'],
        suggestedJobTitles: ['Professional', 'Specialist'],
        experienceLevel: 'mid-level'
      };
      
      return fallbackAnalysis;
    }
  }
}

export const resumeParser = new ResumeParser();