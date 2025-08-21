import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI client with fallback check
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not found in environment variables');
  console.warn('⚠️ Resume analysis will use fallback mock data');
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

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
        try {
          // Try to parse PDF using pdf-parse
          const dataBuffer = fs.readFileSync(filePath);
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(dataBuffer);
          
          if (pdfData.text && pdfData.text.length > 50) {
            console.log(`✅ Successfully extracted ${pdfData.text.length} characters from PDF`);
            return pdfData.text;
          } else {
            throw new Error('PDF text extraction returned insufficient content');
          }
        } catch (pdfError) {
          console.warn('PDF parsing failed, trying alternative methods:', pdfError);
          
          // Try to read the file and extract readable text sequences
          try {
            const buffer = fs.readFileSync(filePath);
            const rawText = buffer.toString('binary');
            
            // Extract readable text patterns more effectively
            const readableSegments: string[] = [];
            
            // Look for text in PDF stream objects and between parentheses
            const patterns = [
              /\(([^)]{3,})\)/g,                    // Text in parentheses
              /BT\s+([^E]+)\s+ET/g,                 // Text between BT/ET markers
              /Tj\s*\[([^\]]+)\]/g,                 // Text arrays
              /([A-Z][a-zA-Z\s,\.]{10,})/g         // Capitalized readable sequences
            ];
            
            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(rawText)) !== null) {
                const segment = match[1] || match[0];
                if (segment && /[A-Za-z]/.test(segment)) {
                  readableSegments.push(segment.trim());
                }
              }
            }
            
            // Also try to find email addresses, names, and common resume keywords
            const emailMatch = rawText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) readableSegments.push(emailMatch[1]);
            
            // Look for phone numbers
            const phoneMatch = rawText.match(/(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
            if (phoneMatch) readableSegments.push(phoneMatch[1]);
            
            // Clean and combine all segments
            let extractedText = readableSegments
              .filter(segment => segment.length > 2)
              .map(segment => segment
                .replace(/[^\w\s@.-]/g, ' ')        // Clean special chars but keep email/web chars
                .replace(/\s+/g, ' ')               // Normalize whitespace
                .trim()
              )
              .filter(segment => segment.length > 2)
              .join(' ');
            
            // Additional cleaning
            extractedText = extractedText
              .replace(/(\w)\s+(\w)\s+(\w)/g, '$1$2$3')  // Fix broken words
              .replace(/\s+/g, ' ')
              .trim();
            
            console.log(`📝 Extracted readable segments: ${extractedText.substring(0, 200)}...`);
            
            if (extractedText.length > 100) {
              console.log(`✅ Extracted readable text from PDF: ${extractedText.length} characters`);
              return extractedText;
            }
          } catch (altError) {
            console.warn('Alternative PDF text extraction also failed:', altError);
          }
          
          throw new Error('Could not extract readable text from PDF file');
        }
      } else if (fileExtension === '.docx') {
        try {
          // Use mammoth for proper DOCX parsing
          const mammoth = (await import('mammoth')).default;
          const buffer = fs.readFileSync(filePath);
          const result = await mammoth.extractRawText({ buffer });
          
          if (result.value && result.value.length > 50) {
            console.log(`✅ Successfully extracted ${result.value.length} characters from DOCX`);
            return result.value;
          } else {
            throw new Error('DOCX text extraction returned insufficient content');
          }
        } catch (docxError) {
          console.warn('DOCX parsing with mammoth failed:', docxError);
          // Fallback to basic buffer reading
          try {
            const buffer = fs.readFileSync(filePath);
            const text = buffer.toString('utf8');
            const cleanedText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
            
            if (cleanedText.length > 100) {
              console.log(`✅ Extracted text from DOCX using fallback method: ${cleanedText.length} characters`);
              return cleanedText;
            }
          } catch (fallbackError) {
            console.warn('DOCX fallback extraction also failed:', fallbackError);
          }
          
          throw new Error('Could not extract readable text from DOCX file');
        }
      } else if (fileExtension === '.doc') {
        // For older DOC files, try basic text extraction
        try {
          const buffer = fs.readFileSync(filePath);
          const text = buffer.toString('utf8');
          const cleanedText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
          
          if (cleanedText.length > 100) {
            console.log(`✅ Extracted text from DOC file: ${cleanedText.length} characters`);
            return cleanedText;
          } else {
            throw new Error('DOC text extraction returned insufficient content');
          }
        } catch (docError) {
          console.warn('DOC text extraction failed:', docError);
          throw new Error('Could not extract readable text from DOC file');
        }
      } else {
        // Try to read as plain text
        const text = fs.readFileSync(filePath, 'utf8');
        if (text && text.length > 50) {
          console.log(`✅ Read plain text file: ${text.length} characters`);
          return text;
        } else {
          throw new Error('Plain text file is too short or empty');
        }
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw new Error(`Failed to extract readable text from resume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze resume text using OpenAI GPT
   */
  private async analyzeWithOpenAI(resumeText: string): Promise<ResumeAnalysis> {
    // Check if OpenAI is available
    if (!openai) {
      console.log('🔄 Using local resume analysis (OpenAI not configured)');
      return this.analyzeWithLocalParser(resumeText);
    }
    
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
      console.log('📝 Resume text preview (first 500 chars):', resumeText.substring(0, 500));
      console.log('📊 Full resume text length:', resumeText.length);
      
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
      console.log('🔍 Raw OpenAI response:', aiResponse?.substring(0, 1000));
      
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
      throw error;
    }
  }

  /**
   * Local resume analysis without external APIs
   */
  private async analyzeWithLocalParser(resumeText: string): Promise<ResumeAnalysis> {
    console.log('🔍 Performing local resume analysis...');
    
    const text = resumeText.toLowerCase();
    
    // Extract skills using common patterns
    const commonSkills = [
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      // Frontend
      'react', 'vue', 'angular', 'html', 'css', 'sass', 'bootstrap', 'tailwind', 'jquery', 'redux',
      // Backend
      'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'asp.net', 'fastapi',
      // Databases
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'firebase', 'supabase', 'prisma',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'github', 'gitlab', 'terraform',
      // Tools & Frameworks
      'git', 'jira', 'figma', 'photoshop', 'sketch', 'webpack', 'vite', 'npm', 'yarn'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
      text.includes(skill) || text.includes(skill.replace('.', ''))
    );
    
    // Extract experience level based on keywords
    let experienceLevel = 'mid-level';
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('architect')) {
      experienceLevel = 'senior';
    } else if (text.includes('junior') || text.includes('intern') || text.includes('entry') || text.includes('graduate')) {
      experienceLevel = 'entry-level';
    } else if (text.includes('director') || text.includes('vp') || text.includes('cto') || text.includes('ceo')) {
      experienceLevel = 'executive';
    }
    
    // Extract job titles from common patterns
    const jobTitlePatterns = [
      /(?:software|web|frontend|backend|full[- ]?stack|mobile).{0,20}(?:engineer|developer|programmer)/gi,
      /(?:data|machine learning|ai).{0,20}(?:scientist|engineer|analyst)/gi,
      /(?:product|project).{0,20}manager/gi,
      /(?:devops|site reliability).{0,20}engineer/gi,
      /(?:ui|ux).{0,20}designer/gi
    ];
    
    const suggestedJobTitles = new Set<string>();
    jobTitlePatterns.forEach(pattern => {
      const matches = resumeText.match(pattern);
      if (matches) {
        matches.forEach(match => suggestedJobTitles.add(match.trim()));
      }
    });
    
    // If no specific job titles found, suggest based on skills
    if (suggestedJobTitles.size === 0) {
      if (foundSkills.some(skill => ['react', 'vue', 'angular', 'html', 'css'].includes(skill))) {
        suggestedJobTitles.add('Frontend Developer');
      }
      if (foundSkills.some(skill => ['node.js', 'express', 'django', 'spring'].includes(skill))) {
        suggestedJobTitles.add('Backend Developer');
      }
      if (foundSkills.some(skill => ['react', 'vue', 'angular'].includes(skill)) && 
          foundSkills.some(skill => ['node.js', 'express', 'python'].includes(skill))) {
        suggestedJobTitles.add('Full Stack Developer');
      }
      if (foundSkills.some(skill => ['python', 'machine learning', 'data'].includes(skill))) {
        suggestedJobTitles.add('Data Scientist');
      }
      if (foundSkills.some(skill => ['aws', 'docker', 'kubernetes'].includes(skill))) {
        suggestedJobTitles.add('DevOps Engineer');
      }
      if (suggestedJobTitles.size === 0) {
        suggestedJobTitles.add('Software Engineer');
      }
    }
    
    // Extract basic company/education info using simple patterns
    const experienceEntries: Array<{
      title: string;
      company: string;
      duration: string;
      description: string;
    }> = [];
    const educationEntries: Array<{
      degree: string;
      school: string;
      year: string;
    }> = [];
    
    // Look for company names (basic pattern matching)
    const companyMatches = resumeText.match(/(?:at|@)\s+([A-Z][A-Za-z\s&.,-]+(?:Inc|LLC|Corp|Company|Ltd)?)/g);
    if (companyMatches && companyMatches.length > 0) {
      companyMatches.slice(0, 3).forEach((match, index) => {
        const company = match.replace(/^(?:at|@)\s+/, '').trim();
        experienceEntries.push({
          title: Array.from(suggestedJobTitles)[0] || 'Software Developer',
          company,
          duration: `${2024 - index - 1}-${2024 - index}`,
          description: `Professional experience at ${company}`
        });
      });
    }
    
    // Look for education (basic pattern matching)
    const degreeMatches = resumeText.match(/(Bachelor|Master|PhD|B\.S\.|M\.S\.|B\.A\.|M\.A\.).{0,50}/gi);
    if (degreeMatches && degreeMatches.length > 0) {
      degreeMatches.slice(0, 2).forEach(match => {
        educationEntries.push({
          degree: match.trim(),
          school: 'University',
          year: '2020'
        });
      });
    }
    
    const analysis: ResumeAnalysis = {
      skills: foundSkills.map(skill => skill.charAt(0).toUpperCase() + skill.slice(1)),
      experience: experienceEntries,
      education: educationEntries,
      keywords: foundSkills,
      suggestedJobTitles: Array.from(suggestedJobTitles).slice(0, 5),
      experienceLevel,
    };
    
    console.log(`📊 Local analysis complete: ${analysis.skills.length} skills, experience level: ${experienceLevel}`);
    
    return analysis;
  }
}

export const resumeParser = new ResumeParser();

// Export a simple function that matches the original interface
export async function parseResume(fileBuffer: Buffer, fileName: string): Promise<ResumeAnalysis> {
  // Save buffer to temporary file
  const tempPath = path.join('/tmp', `temp_${Date.now()}_${fileName}`);
  fs.writeFileSync(tempPath, fileBuffer);
  
  try {
    const analysis = await resumeParser.parseResume(tempPath, fileName);
    return analysis;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.warn('Could not delete temp file:', tempPath);
    }
  }
}