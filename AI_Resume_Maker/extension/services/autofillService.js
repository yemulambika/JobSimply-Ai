// Autofill Service - Handles form detection, field mapping, and AI-generated answers
// For use in content script and background worker

// Field type patterns for detection
export const FIELD_PATTERNS = {
  // Personal
  firstName: /^(first\s*name|given\s*name|forename|full\s*name|your\s*name)$/i,
  lastName: /^(last\s*name|family\s*name|surname|sur\s*name)$/i,
  fullName: /^(full\s*name|complete\s*name|name|your\s*name)$/i,
  email: /^(email|e-?mail|email\s*address|e-?mail\s*address)$/i,
  phone: /^(phone|telephone|mobile|cell|contact\s*number|phone\s*number)$/i,
  
  // Location
  address: /^(street\s*address|address|address\s*line\s*1|street)$/i,
  addressLine2: /^(address\s*line\s*2|apt|suite|unit|floor)$/i,
  city: /^(city|town|municipality|suburb)$/i,
  state: /^(state|province|region|county)$/i,
  zip: /^(zip|zip\s*code|postal\s*code|pin\s*code|postcode)$/i,
  country: /^(country|nation)$/i,
  
  // Professional
  linkedin: /^(linkedin|linked\s*in|linkedin\s*url)$/i,
  github: /^(github|git\s*hub)$/i,
  portfolio: /^(portfolio|website|personal\s*site|personal\s*website)$/i,
  
  // Experience
  currentCompany: /^(current\s*company|current\s*employer|present\s*employer|company\s*name)$/i,
  jobTitle: /^(job\s*title|position|role|designation|title|current\s*title)$/i,
  yearsExperience: /^(total\s*experience|years?\s*of\s*experience|overall\s*experience|experience\s*years)$/i,
  startDate: /^(start\s*date|employment\s*start|date\s*from|from\s*date|joined)$/i,
  endDate: /^(end\s*date|employment\s*end|date\s*to|to\s*date|until)$/i,
  
  // Education
  school: /^(school|university|college|institution|education)$/i,
  degree: /^(degree|qualification|bachelor|master|phd)$/i,
  fieldOfStudy: /^(field\s*of\s*study|major| specialization|subject)$/i,
  graduationYear: /^(graduation\s*year|passing\s*year|year\s*of\s*passing|graduated)$/i,
  
  // Skills
  skills: /^(skills|technical\s*skills|competencies|technologies)$/i,
  
  // Salary/Compensation
  currentSalary: /^(current\s*salary|present\s*salary|ctc|current\s*ctc|existing\s*salary)$/i,
  expectedSalary: /^(expected\s*salary|expected\s*ctc|desired\s*salary|notice\s*salary)$/i,
  salary: /^(salary|pay|compensation)$/i,
  
  // Notice Period
  noticePeriod: /^(notice\s*period|serving\s*notice|immediate|availability|available\s*from)$/i,
  
  // Work Authorization
  visaStatus: /^(visa\s*status|work\s*authorization|authorization|citizenship)$/i,
  workSponsorship: /^(sponsorship|require\s*sponsorship|need\s*sponsorship|visa\s*sponsorship)$/i,
  
  // Preferences
  remoteWork: /^(remote|work\s*from\s*home|remote\s*work|wfh|hybrid|prefer|preferred\s*location)$/i,
  relocation: /^(relocation|willing\s*to\s*relocate|relocate)$/i,
  
  // Open Source / Additional
  openSource: /^(open\s*source|contributions|github\s*projects|projects)$/i,
  
  // Personal Summary
  summary: /^(summary|about\s*you|profile\s*summary|bio|objective|introduction)$/i,
  objective: /^(objective|career\s*objective|professional\s*objective)$/i,
  coverLetter: /^(cover\s*letter|cover\s*letter|letter)$/i,
  
  // Questions
  strengths: /^(strengths|strength|your\s*strengths|key\s*strengths|top\s*strengths)$/i,
  weaknesses: /^(weaknesses|weakness|your\s*weaknesses|area\s*for\s*improvement)$/i,
  whyHire: /^(why\s*should\s*we\s*hire|why\s*hire|why\s*you|reason\s*to\s*hire)$/i,
  whyCompany: /^(why\s*our\s*company|why\s*us|why\s*this\s*company|why\s*interested)$/i,
  biggestAchievement: /^(biggest\s*achievement|greatest\s*achievement|achievement|proudest)$/i,
  leadershipExperience: /^(leadership|leadership\s*experience|managed\s*team|team\s*size)$/i,
  conflictResolution: /^(conflict|conflict\s*resolution|handle\s*disagreement)$/i,
  biggestFailure: /^(biggest\s*failure|failure|mistake|regret)$/i,
  successStory: /^(success|success\s*story|accomplishment)$/i,
  reasonForLeaving: /^(reason\s*for\s*leaving|why\s*leaving|left\s*reason)$/i,
  
  // Availability
  availableStart: /^(available\s*start|start\s*date|when\s*can\s*you\s*start|availability)$/i,
  availability: /^(availability|available|schedule)$/i,
};

/**
 * Extract form fields from a page
 */
export function detectFormFields(container = document) {
  const fields = [];
  const inputs = container.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    const field = analyzeInput(input);
    if (field) {
      fields.push(field);
    }
  });
  
  return fields;
}

/**
 * Analyze a single input element
 */
function analyzeInput(input) {
  const field = {
    element: input,
    type: input.type?.toLowerCase() || 'text',
    name: input.name || '',
    id: input.id || '',
    label: getInputLabel(input),
    placeholder: input.placeholder || '',
    value: input.value || '',
    required: input.required || input.hasAttribute('aria-required'),
    maxLength: input.maxLength || null,
  };
  
  // Determine field category
  field.category = categorizeField(field);
  
  // Skip hidden fields
  if (field.type === 'hidden' || !isVisible(input)) {
    return null;
  }
  
  return field;
}

/**
 * Get label text for an input
 */
function getInputLabel(input) {
  // Try label for attribute
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Try aria-label
  if (input.getAttribute('aria-label')) {
    return input.getAttribute('aria-label');
  }
  
  // Try aria-labelledby
  const labelledById = input.getAttribute('aria-labelledby');
  if (labelledById) {
    const labelledBy = document.getElementById(labelledById);
    if (labelledBy) return labelledBy.textContent.trim();
  }
  
  // Try parent label
  let parent = input.parentElement;
  for (let i = 0; i < 3 && parent; i++) {
    if (parent.tagName === 'LABEL') {
      return parent.textContent.trim();
    }
    parent = parent.parentElement;
  }
  
  // Try closest wrapper text
  const wrapper = input.closest('div', 'td', 'th');
  if (wrapper) {
    const firstText = wrapper.textContent.split('\n')[0].trim();
    if (firstText && firstText.length < 100) {
      return firstText;
    }
  }
  
  return '';
}

/**
 * Check if element is visible
 */
function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         el.offsetParent !== null;
}

/**
 * Categorize a field based on its attributes
 */
function categorizeField(field) {
  const searchText = `${field.name} ${field.label} ${field.placeholder}`.toLowerCase();
  
  // Check against patterns
  for (const [category, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(searchText)) {
      return category;
    }
  }
  
  // Default categorization by input type
  if (field.type === 'email') return 'email';
  if (field.type === 'tel') return 'phone';
  if (field.type === 'url') return 'url';
  if (field.type === 'number') return 'number';
  if (field.type === 'date') return 'date';
  
  return 'text';
}

/**
 * Map profile data to form fields
 */
export function mapProfileToFields(profile, fields) {
  const filledFields = [];
  const unfilledFields = [];
  
  for (const field of fields) {
    const value = getProfileValueForField(profile, field);
    
    if (value !== null && value !== undefined && value !== '') {
      filledFields.push({
        ...field,
        mappedValue: value,
        confidence: calculateConfidence(field, value),
      });
    } else {
      unfilledFields.push(field);
    }
  }
  
  return { filledFields, unfilledFields };
}

/**
 * Get profile value for a specific field
 */
function getProfileValueForField(profile, field) {
  const category = field.category;
  
  // Direct mappings
  const directMappings = {
    firstName: profile.firstName || profile.name?.split(' ')[0],
    lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' '),
    fullName: profile.name || `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    country: profile.country,
    linkedin: profile.linkedin,
    github: profile.github,
    portfolio: profile.portfolio,
    currentCompany: profile.currentCompany,
    jobTitle: profile.designation,
    school: profile.education?.[0]?.school || profile.education?.[0]?.institution,
    degree: profile.education?.[0]?.degree,
    fieldOfStudy: profile.education?.[0]?.field,
    currentSalary: profile.currentCtc,
    expectedSalary: profile.expectedSalary,
    noticePeriod: profile.noticePeriod,
    visaStatus: profile.visaStatus,
  };
  
  if (directMappings[category]) {
    return directMappings[category];
  }
  
  // Handle skills as comma-separated string
  if (category === 'skills' && profile.skills) {
    if (Array.isArray(profile.skills)) {
      return profile.skills.join(', ');
    }
    if (typeof profile.skills === 'object') {
      return Object.values(profile.skills).flat().join(', ');
    }
  }
  
  // Handle array fields
  if (category === 'experience' && profile.experience) {
    return profile.experience;
  }
  
  return null;
}

/**
 * Calculate confidence score for field mapping
 */
function calculateConfidence(field, value) {
  let confidence = 0.5;
  
  // Exact label match
  for (const [category, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (pattern.test(field.label.toLowerCase())) {
      confidence += 0.3;
      break;
    }
  }
  
  // Name attribute match
  if (field.name && field.name.toLowerCase().includes(field.category)) {
    confidence += 0.2;
  }
  
  return Math.min(1, confidence);
}

/**
 * Fill a form field with a value
 */
export function fillField(field, value) {
  if (!field.element) return false;
  
  const input = field.element;
  
  // Focus first
  input.focus();
  
  // Set value based on field type
  if (input.tagName === 'SELECT') {
    return fillSelect(input, value);
  }
  
  // Clear existing value
  input.value = '';
  
  // Set new value
  input.value = value;
  
  // Trigger events
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  
  return true;
}

/**
 * Fill a select element
 */
function fillSelect(select, value) {
  const options = Array.from(select.options);
  const normalizedValue = value.toLowerCase().trim();
  
  // Try exact match
  let selectedOption = options.find(opt => 
    opt.value.toLowerCase() === normalizedValue ||
    opt.textContent.toLowerCase() === normalizedValue
  );
  
  // Try partial match
  if (!selectedOption) {
    selectedOption = options.find(opt => 
      opt.value.toLowerCase().includes(normalizedValue) ||
      opt.textContent.toLowerCase().includes(normalizedValue)
    );
  }
  
  if (selectedOption) {
    select.value = selectedOption.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  
  return false;
}

/**
 * Check if field is checked (for checkboxes/radios)
 */
export function isFieldChecked(field) {
  return field.element?.checked || false;
}

/**
 * Check a checkbox/radio
 */
export function checkField(field, checked = true) {
  if (!field.element) return false;
  
  if (field.type === 'checkbox' || field.type === 'radio') {
    field.element.checked = checked;
    field.element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  
  return false;
}

// AI Question Answering Templates
export const QUESTION_TEMPLATES = {
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
  
  coverLetter: (profile, job) => {
    const name = profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    const intro = `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${job?.title || 'position'} at ${job?.company || 'your company'}.`;
    
    const body = profile.summary || profile.objective || 
      `With my background in ${profile.skills?.slice(0, 3).join(', ') || 'technology'} and proven track record of delivering results, I am confident in my ability to contribute meaningfully to your team.`;
    
    const closing = `\n\nI would welcome the opportunity to discuss how my skills and experience align with your requirements. Thank you for considering my application.\n\nSincerely,\n${name}`;
    
    return intro + '\n\n' + body + closing;
  },
};

/**
 * Generate AI answer for a question based on profile and job
 */
export function generateAIAnswer(questionType, profile, job = {}) {
  const template = QUESTION_TEMPLATES[questionType];
  
  if (!template) {
    return null;
  }
  
  if (typeof template === 'function') {
    return template(profile, job);
  }
  
  if (Array.isArray(template)) {
    // Pick a random template based on some logic
    // In production, this could use AI to select the best one
    return template[Math.floor(Math.random() * template.length)];
  }
  
  return template;
}

/**
 * Get all questions that need AI-generated answers
 */
export function getUnansweredQuestions(fields, profile) {
  const unanswered = [];
  
  for (const field of fields) {
    const profileValue = getProfileValueForField(profile, field);
    
    if (profileValue === null || profileValue === '' || 
        (Array.isArray(profileValue) && profileValue.length === 0)) {
      
      // Check if this is a question type we can answer
      const questionType = mapToQuestionType(field.category);
      if (questionType && QUESTION_TEMPLATES[questionType]) {
        unanswered.push({
          field,
          questionType,
          suggestedAnswer: generateAIAnswer(questionType, profile, {}),
        });
      }
    }
  }
  
  return unanswered;
}

/**
 * Map field category to question type
 */
function mapToQuestionType(category) {
  const mapping = {
    strengths: 'strengths',
    weaknesses: 'weaknesses',
    whyHire: 'whyHire',
    biggestAchievement: 'biggestAchievement',
    leadershipExperience: 'leadership',
    conflictResolution: 'conflict',
    biggestFailure: 'biggestFailure',
    successStory: 'successStory',
    reasonForLeaving: 'reasonForLeaving',
    whyCompany: 'whyCompany',
    summary: 'summary',
    objective: 'objective',
  };
  
  return mapping[category] || null;
}
