// AI Answers Controller - Generate intelligent answers for job application questions
// Uses AI to generate personalized, ATS-friendly responses

import { getPool } from '../services/postgres.js';
import { getLatestResume } from '../services/postgres.js';

// Question templates with AI-friendly answers
const ANSWER_TEMPLATES = {
  strengths: [
    "I am a quick learner who adapts rapidly to new technologies and challenges. My analytical thinking helps me break down complex problems into manageable solutions. I thrive in collaborative environments and communicate technical concepts clearly to diverse audiences.",
    "My greatest strengths include strong technical proficiency, attention to detail, and a proactive approach to problem-solving. I take ownership of my work and consistently deliver high-quality results while meeting deadlines."
  ],
  
  weaknesses: [
    "I sometimes take on too many responsibilities trying to ensure everything is done perfectly. I'm learning to delegate more effectively and trust my team members to handle tasks appropriately.",
    "I can be overly critical of my own work, which sometimes slows down delivery. I'm working on finding the balance between perfection and timely execution."
  ],
  
  whyHire: [
    "I bring a combination of strong technical skills and a proven track record of delivering results. My ability to quickly adapt to new environments and learn new technologies makes me a valuable addition to any team.",
    "I am passionate about my work and committed to continuous improvement. With my experience in relevant technologies and my collaborative approach, I can contribute meaningfully from day one."
  ],
  
  biggestAchievement: [
    "One of my proudest achievements was leading a critical project that improved system performance by 40%. This required careful planning, coordination with cross-functional teams, and solving complex technical challenges.",
    "I successfully delivered a major feature that had significant business impact, receiving positive feedback from both stakeholders and end users. The project strengthened my skills in project management and technical execution."
  ],
  
  leadership: [
    "I have experience leading small teams and mentoring junior developers. I believe in empowering team members by providing clear direction while encouraging autonomy and creative problem-solving.",
    "Through my experience, I've developed strong leadership skills including effective communication, conflict resolution, and the ability to motivate teams toward shared goals."
  ],
  
  conflict: [
    "I believe in addressing conflicts directly and respectfully. I listen to all perspectives, focus on finding common ground, and work collaboratively to reach solutions that satisfy everyone involved.",
    "When disagreements arise, I try to understand the underlying concerns and work toward mutually beneficial outcomes. I believe healthy debate leads to better decisions."
  ],
  
  biggestFailure: [
    "Early in my career, I underestimated the time required for a complex task. I learned the importance of thorough planning and breaking down large tasks into smaller, manageable pieces with realistic timelines.",
    "I experienced a project setback due to poor communication. This taught me the value of regular status updates and ensuring alignment with all stakeholders throughout the project lifecycle."
  ],
  
  successStory: [
    "I take pride in consistently exceeding performance targets while maintaining high quality standards. My methodical approach and attention to detail have helped me deliver successful projects that drove measurable business value.",
    "My ability to collaborate effectively with cross-functional teams has been key to my success. I believe in building strong relationships based on trust and mutual respect."
  ],
  
  reasonForLeaving: [
    "I am seeking new opportunities that offer greater challenges and growth potential. I believe my skills and experience can contribute more significantly to a dynamic organization.",
    "I'm looking to expand my horizons and work on diverse projects that will help me develop as a professional while making meaningful contributions to the team."
  ],
  
  whyCompany: [
    "I am impressed by your company's commitment to innovation and its positive impact in the industry. The opportunity to work with talented professionals and contribute to meaningful projects aligns perfectly with my career goals.",
    "Your company's values and culture resonate with my professional ethos. I am excited about the possibility of bringing my experience and enthusiasm to your team."
  ],
  
  availability: [
    "I am available to start within the notice period specified. I am flexible and can coordinate to ensure a smooth transition.",
    "I can discuss my availability in detail based on your timeline. Currently, I am in my notice period but can start immediately for the right opportunity."
  ],
  
  salary: [
    "I am open to discussing compensation based on the overall package and growth opportunities. I believe in fair compensation that reflects experience and skills.",
    "My salary expectations are negotiable and based on the complete benefits package. I am more focused on finding the right fit than maximizing compensation alone."
  ],
  
  remoteWork: [
    "I am comfortable with remote work and have proven experience working effectively in distributed teams. I maintain strong communication and productivity regardless of location.",
    "I am flexible with work arrangements and have successfully collaborated with teams in hybrid and fully remote settings."
  ],
  
  relocation: [
    "I am open to relocation for the right opportunity and have done so in the past for career advancement.",
    "I am flexible regarding location and willing to relocate if the role is the right fit. I understand that some positions may require physical presence."
  ],
  
  sponsorship: [
    "I am authorized to work in the country without requiring visa sponsorship. I can provide documentation upon request.",
    "I have work authorization and do not require visa sponsorship at this time."
  ]
};

/**
 * Generate AI answer for a specific question type
 */
function generateAnswer(questionType, context = {}) {
  const templates = ANSWER_TEMPLATES[questionType];
  
  if (!templates || templates.length === 0) {
    return null;
  }
  
  // Select a template based on context if available
  const index = context.experienceLevel === 'senior' ? 1 : 0;
  let answer = templates[index] || templates[0];
  
  // Customize answer with context
  if (context.skills && answer) {
    // Add relevant skills to answer if appropriate
    const skills = Array.isArray(context.skills) ? context.skills.slice(0, 3) : [];
    if (skills.length > 0 && answer.includes('technical')) {
      answer = answer.replace('technical skills', `technical skills including ${skills.join(', ')}`);
    }
  }
  
  if (context.jobTitle && answer) {
    // Customize for specific role if appropriate
    answer = answer.replace('team', `team in ${context.jobTitle} role`);
  }
  
  return answer;
}

/**
 * Generate multiple answers at once
 */
export const generateAnswers = async (req, res, next) => {
  try {
    const { questions = [], context = {} } = req.body;
    const userId = req.user?.id;
    
    // If user is authenticated, enrich context with their data
    if (userId) {
      try {
        const resume = await getLatestResume(userId);
        if (resume) {
          context.resume = resume;
          
          // Extract skills from resume
          if (resume.parsedData?.skills) {
            context.skills = resume.parsedData.skills
              .filter(s => typeof s === 'string')
              .slice(0, 10);
          }
        }
      } catch (e) {
        console.log('[AI] Could not load user resume for context');
      }
    }
    
    // Generate answers for requested questions
    const answers = {};
    
    for (const question of questions) {
      const questionType = normalizeQuestionType(question);
      
      if (questionType && ANSWER_TEMPLATES[questionType]) {
        answers[question] = {
          type: questionType,
          answer: generateAnswer(questionType, context),
          confidence: 'high',
          canSave: true
        };
      } else {
        answers[question] = {
          type: 'general',
          answer: generateGeneralAnswer(question, context),
          confidence: 'medium',
          canSave: false
        };
      }
    }
    
    res.status(200).json({
      success: true,
      answers,
      context: {
        hasResume: !!context.resume,
        skillsCount: context.skills?.length || 0
      }
    });
  } catch (error) {
    console.error('[AI] Generate answers error:', error);
    next(error);
  }
};

/**
 * Generate a single answer for a specific question
 */
export const generateSingleAnswer = async (req, res, next) => {
  try {
    const { question, context = {} } = req.body;
    const userId = req.user?.id;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Enrich context if authenticated
    if (userId) {
      try {
        const resume = await getLatestResume(userId);
        if (resume) {
          context.resume = resume;
          if (resume.parsedData?.skills) {
            context.skills = resume.parsedData.skills
              .filter(s => typeof s === 'string')
              .slice(0, 10);
          }
        }
      } catch (e) {}
    }
    
    const questionType = normalizeQuestionType(question);
    
    let answer = null;
    let confidence = 'low';
    
    if (questionType && ANSWER_TEMPLATES[questionType]) {
      answer = generateAnswer(questionType, context);
      confidence = 'high';
    } else {
      answer = generateGeneralAnswer(question, context);
      confidence = 'medium';
    }
    
    res.status(200).json({
      success: true,
      question,
      questionType,
      answer,
      confidence,
      canSave: confidence === 'high'
    });
  } catch (error) {
    console.error('[AI] Generate single answer error:', error);
    next(error);
  }
};

/**
 * Improve existing text
 */
export const improveText = async (req, res, next) => {
  try {
    const { text, type = 'general' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Basic text improvements based on type
    let improved = text;
    
    // Remove redundant words
    improved = improved.replace(/\b(very|really|extremely|basically|actually)\s+/gi, '');
    
    // Ensure professional tone
    improved = improved.replace(/\b(gonna|wanna|kinda|sorta)\b/gi, (match) => {
      const replacements = { gonna: 'going to', wanna: 'want to', kinda: 'somewhat', sorta: 'somewhat' };
      return replacements[match];
    });
    
    // Capitalize first letter of sentences
    improved = improved.split(/(?<=[.!?])\s+/).map(sentence => 
      sentence.charAt(0).toUpperCase() + sentence.slice(1)
    ).join(' ');
    
    // Ensure proper spacing after punctuation
    improved = improved.replace(/\s*([,;:])\s*/g, '$1 ');
    
    // Fix common typos
    improved = improved.replace(/\b(teh|adn|htat)\b/gi, (match) => {
      const replacements = { teh: 'the', adn: 'and', htat: 'that' };
      return replacements[match];
    });
    
    res.status(200).json({
      success: true,
      original: text,
      improved,
      suggestions: [
        'Ensure consistent professional tone',
        'Remove filler words for impact',
        'Use active voice where appropriate'
      ]
    });
  } catch (error) {
    console.error('[AI] Improve text error:', error);
    next(error);
  }
};

/**
 * Save generated answer to profile
 */
export const saveAnswer = async (req, res, next) => {
  try {
    const { questionType, answer } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!questionType || !answer) {
      return res.status(400).json({ error: 'Question type and answer are required' });
    }
    
    // Map question type to profile field
    const profileFieldMap = {
      strengths: 'strengths',
      weaknesses: 'weaknesses',
      biggestAchievement: 'achievements',
      leadership: 'leadershipExperience'
    };
    
    const profileField = profileFieldMap[questionType];
    
    if (!profileField) {
      return res.status(400).json({ error: 'Cannot save this question type to profile' });
    }
    
    const pool = getPool();
    const result = await pool.query(
      `UPDATE "User" SET "${profileField}" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [answer, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Answer saved to profile'
    });
  } catch (error) {
    console.error('[AI] Save answer error:', error);
    next(error);
  }
};

/**
 * Normalize question to known type
 */
function normalizeQuestionType(question) {
  const q = question.toLowerCase();
  
  const typeMappings = {
    strengths: ['strength', 'your strengths', 'key strengths', 'top strengths', 'greatest strength'],
    weaknesses: ['weakness', 'your weaknesses', 'areas for improvement', 'area of improvement'],
    whyHire: ['why should we hire', 'why hire', 'why you', 'reason to hire', 'why are you a good fit'],
    biggestAchievement: ['biggest achievement', 'greatest achievement', 'proudest achievement', 'major accomplishment'],
    leadership: ['leadership', 'leadership experience', 'managed team', 'team size'],
    conflict: ['conflict', 'conflict resolution', 'handle disagreement', 'disagreement'],
    biggestFailure: ['biggest failure', 'failure', 'mistake', 'regret'],
    successStory: ['success', 'success story', 'accomplishment'],
    reasonForLeaving: ['reason for leaving', 'why leaving', 'left reason'],
    whyCompany: ['why our company', 'why us', 'why this company', 'why interested'],
    availability: ['availability', 'available', 'when can you start', 'start date'],
    salary: ['salary expectation', 'expected salary', 'compensation', 'pay'],
    remoteWork: ['remote work', 'work from home', 'remote', 'hybrid', 'wfh'],
    relocation: ['relocation', 'willing to relocate', 'relocate'],
    sponsorship: ['sponsorship', 'visa sponsorship', 'require sponsorship', 'work authorization']
  };
  
  for (const [type, patterns] of Object.entries(typeMappings)) {
    if (patterns.some(p => q.includes(p))) {
      return type;
    }
  }
  
  return null;
}

/**
 * Generate general answer for unknown questions
 */
function generateGeneralAnswer(question, context = {}) {
  // For unknown questions, generate a template-based response
  const q = question.toLowerCase();
  
  if (q.includes('tell me about')) {
    if (context.skills?.length > 0) {
      return `I am a professional with expertise in ${context.skills.slice(0, 5).join(', ')}. I bring a strong technical background and a proven ability to deliver results. I am passionate about continuous learning and contributing to meaningful projects.`;
    }
    return 'I am a dedicated professional with a strong technical background and a passion for continuous growth. I bring proven experience in delivering quality work while collaborating effectively with teams.';
  }
  
  if (q.includes('yourself') || q.includes('about me')) {
    return 'I am a motivated professional who values continuous learning and collaborative work. With my technical expertise and strong communication skills, I am committed to delivering value and growing with the organization.';
  }
  
  if (q.includes('goal') || q.includes('objective')) {
    return 'My career goal is to contribute meaningfully to innovative projects while continuously developing my skills. I seek opportunities that challenge me and provide growth potential.';
  }
  
  // Default response
  return 'I am prepared to discuss this further during the interview. I believe in addressing questions thoughtfully and providing honest, relevant answers.';
}

/**
 * Analyze job description and suggest answers
 */
export const analyzeJobForAnswers = async (req, res, next) => {
  try {
    const { jobDescription, questions = [] } = req.body;
    
    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }
    
    // Extract keywords from job description
    const jobKeywords = extractJobKeywords(jobDescription);
    
    // For each question, provide tailored guidance
    const suggestions = questions.map(question => {
      const questionType = normalizeQuestionType(question);
      
      return {
        question,
        questionType,
        keywordsToInclude: questionType ? jobKeywords[questionType] || [] : [],
        tips: getAnswerTips(questionType, jobKeywords)
      };
    });
    
    res.status(200).json({
      success: true,
      jobKeywords,
      suggestions,
      atsTips: generateAtsTips(jobKeywords)
    });
  } catch (error) {
    console.error('[AI] Analyze job for answers error:', error);
    next(error);
  }
};

/**
 * Extract keywords from job description for different answer types
 */
function extractJobKeywords(description) {
  const text = description.toLowerCase();
  
  const keywords = {
    strengths: [],
    technical: [],
    soft: [],
    leadership: []
  };
  
  // Technical skills to look for
  const technicalPatterns = [
    'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'python', 'java',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'sql', 'nosql',
    'agile', 'scrum', 'ci/cd', 'microservices', 'api'
  ];
  
  technicalPatterns.forEach(skill => {
    if (text.includes(skill)) {
      keywords.technical.push(skill);
    }
  });
  
  // Leadership indicators
  const leadershipPatterns = ['lead', 'mentor', 'manage', 'team', 'supervise', 'coordinate'];
  leadershipPatterns.forEach(term => {
    if (text.includes(term)) {
      keywords.leadership.push(term);
    }
  });
  
  // Soft skills
  const softPatterns = ['communication', 'problem-solving', 'analytical', 'teamwork', 'collaboration'];
  softPatterns.forEach(skill => {
    if (text.includes(skill)) {
      keywords.soft.push(skill);
    }
  });
  
  return keywords;
}

/**
 * Get tips for answering specific question types
 */
function getAnswerTips(questionType, jobKeywords) {
  const tips = {
    strengths: `Focus on skills mentioned in the job description: ${jobKeywords.technical.slice(0, 5).join(', ') || 'technical skills'}.`,
    weaknesses: 'Choose a genuine weakness that is not critical to the role and explain how you are improving.',
    whyHire: 'Match your strengths to the job requirements. Highlight unique qualifications others may not have.',
    biggestAchievement: 'Choose an achievement relevant to the role. Quantify results if possible.',
    leadership: jobKeywords.leadership.length > 0 
      ? 'Emphasize experience with: ' + jobKeywords.leadership.join(', ')
      : 'Share examples of initiative and team collaboration.',
  };
  
  return tips[questionType] || 'Be specific and use examples where possible.';
}

/**
 * Generate ATS tips based on job keywords
 */
function generateAtsTips(jobKeywords) {
  const tips = [];
  
  if (jobKeywords.technical.length > 5) {
    tips.push(`Include ${jobKeywords.technical.length} technical skills mentioned in the job description.`);
  }
  
  if (jobKeywords.leadership.length > 0) {
    tips.push('Highlight leadership and team management experience.');
  }
  
  if (jobKeywords.soft.length > 2) {
    tips.push('Demonstrate soft skills through specific examples.');
  }
  
  tips.push('Use keywords naturally throughout your answers.');
  tips.push('Quantify achievements where possible.');
  
  return tips;
}
