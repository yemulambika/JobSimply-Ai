/**
 * Skill Normalizer - Semantic matching and skill categorization
 * Implements semantic matching as described in the requirements:
 * - Software Development → Developer → Developed → Software Engineer → Application Development → Engineering
 * - Programming → Java → Python → JavaScript → TypeScript → Coding → Development
 */

// Skill category mappings - all skills belong to broader categories
const SKILL_CATEGORIES = {
  // Software Development category (core)
  'software development': [
    'software development', 'software engineering', 'application development', 'developer', 
    'full stack', 'fullstack', 'frontend', 'backend', 'web development', 'web developer',
    'software engineer', 'application engineer', 'programming', 'coding', 'development'
  ],
  
  // Backend category
  'backend': [
    'nodejs', 'node.js', 'node', 'express', 'express.js', 'backend', 'server', 'api', 
    'rest api', 'restful', 'graphql', 'microservices', 'django', 'flask', 'spring', 
    '.net', 'asp.net', 'asp.net core', 'laravel', 'rails', 'ruby on rails',
    'server-side', 'server side', 'serverless', 'lambda'
  ],
  
  // Frontend category
  'frontend': [
    'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'vue.js', 'angular', 'angularjs',
    'nextjs', 'next.js', 'nuxt', 'svelte', 'html', 'css', 'typescript', 'tailwind',
    'bootstrap', 'material-ui', 'redux', 'jquery', 'sass', 'less', 'frontend',
    'ui', 'ux', 'web development', 'frontend development'
  ],
  
  // Languages category
  'languages': [
    'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c#', 'csharp', 'c sharp',
    'c++', 'cpp', 'go', 'golang', 'rust', 'php', 'ruby', 'swift', 'kotlin', 
    'scala', 'r', 'sql'
  ],
  
  // Database category
  'database': [
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo db', 'redis', 
    'elasticsearch', 'firebase', 'database', 'nosql', 'dynamodb', 'sqlite'
  ],
  
  // DevOps category
  'devops': [
    'docker', 'kubernetes', 'ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab ci',
    'terraform', 'ansible', 'aws', 'azure', 'gcp', 'cloud', 'deployment', 'devops'
  ],
  
  // Cloud category
  'cloud': [
    'aws', 'azure', 'gcp', 'google cloud', 'amazon web services', 'cloud computing',
    'cloud', 'docker', 'kubernetes', 'serverless', 'lambda'
  ]
};

// Flatten categories for quick lookup
const SKILL_TO_CATEGORY = {};
for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
  for (const skill of skills) {
    SKILL_TO_CATEGORY[skill.toLowerCase()] = category;
  }
}

// Action verb variations - for matching verbs in text
const ACTION_VERBS = {
  'develop': ['develop', 'developed', 'developing', 'development', 'builds', 'building', 'built'],
  'design': ['design', 'designed', 'designing', 'designs'],
  'implement': ['implement', 'implemented', 'implementing'],
  'create': ['create', 'created', 'creating'],
  'build': ['build', 'built', 'building', 'builds', 'built'],
  'test': ['test', 'tested', 'testing', 'tests'],
  'deploy': ['deploy', 'deployed', 'deploying', 'deploys'],
  'maintain': ['maintain', 'maintained', 'maintaining'],
  'manage': ['manage', 'managed', 'managing'],
  'lead': ['lead', 'led', 'leading', 'leads'],
  'collaborate': ['collaborate', 'collaborated', 'collaborating'],
  'engineer': ['engineer', 'engineered', 'engineering', 'engineers'],
  'program': ['program', 'programming', 'programs', 'programmed'],
  'code': ['code', 'coding', 'coded', 'codes'],
};

// Skill synonym mappings
const SKILL_SYNONYMS = {
  'reactjs': 'react',
  'react js': 'react',
  'vuejs': 'vue',
  'vue js': 'vue',
  'vue.js': 'vue',
  'nodejs': 'node.js',
  'node js': 'node.js',
  'node': 'node.js',
  '.net core': 'asp.net core',
  'dot net core': 'asp.net core',
  'rest': 'rest api',
  'restful': 'rest api',
  'postgres': 'postgresql',
  'mongodb': 'mongo db',
  'js': 'javascript',
  'ts': 'typescript',
  'c#': 'csharp',
  'c sharp': 'csharp',
  'golang': 'go',
  'react native': 'react',
  'angularjs': 'angular',
  'angular js': 'angular',
  'next.js': 'nextjs',
  'express.js': 'express',
  'aws': 'amazon web services',
  'gcp': 'google cloud platform',
};

// Skills to ignore (single letters or rare patterns)
const IGNORED_SKILLS = new Set([
  'r', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
]);

// Check if a skill should be ignored
function shouldIgnore(skill) {
  const lower = (skill || '').toLowerCase().trim();
  if (lower.length <= 1) return true;
  if (IGNORED_SKILLS.has(lower)) return true;
  return false;
}

// Normalize a single skill
export function normalizeSkill(skill) {
  if (!skill) return null;
  
  let normalized = String(skill).toLowerCase().trim();
  
  // Remove punctuation
  normalized = normalized.replace(/[.,;:]/g, '');
  
  // Apply synonym mapping
  if (SKILL_SYNONYMS[normalized]) {
    normalized = SKILL_SYNONYMS[normalized];
  }
  
  // Ignore trivial skills
  if (shouldIgnore(normalized)) {
    return null;
  }
  
  return normalized;
}

// Normalize an array of skills
export function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  
  return skills
    .map(normalizeSkill)
    .filter(s => s !== null)
    .filter((skill, index, self) => self.indexOf(skill) === index);
}

// Categorize skills into buckets
export function categorizeSkills(skills) {
  const categorized = {
    languages: [],
    frontend: [],
    backend: [],
    databases: [],
    cloud: [],
    devops: [],
    ai_ml: [],
    tools: [],
    other: []
  };
  
  const lowerSkills = skills.map(s => s.toLowerCase());
  
  const languages = ['javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'sql'];
  const frontend = ['react', 'vue', 'angular', 'nextjs', 'svelte', 'jquery', 'bootstrap', 'tailwind', 'html', 'css', 'redux'];
  const backend = ['node.js', 'express', 'django', 'flask', 'spring', 'asp.net core', 'laravel', 'rails', 'graphql', 'rest api', 'microservices'];
  const databases = ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'dynamodb', 'firebase'];
  const cloud = ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'serverless', 'lambda'];
  const devops = ['git', 'jenkins', 'circleci', 'github actions', 'gitlab ci', 'ci/cd', 'ansible', 'terraform'];
  const ai_ml = ['machine learning', 'tensorflow', 'pytorch', 'ai', 'nlp', 'computer vision', 'llm', 'openai'];
  
  lowerSkills.forEach(skill => {
    if (languages.includes(skill)) {
      categorized.languages.push(skill);
    } else if (frontend.includes(skill)) {
      categorized.frontend.push(skill);
    } else if (backend.includes(skill)) {
      categorized.backend.push(skill);
    } else if (databases.includes(skill)) {
      categorized.databases.push(skill);
    } else if (cloud.some(c => skill.includes(c))) {
      categorized.cloud.push(skill);
    } else if (devops.some(d => skill.includes(d))) {
      categorized.devops.push(skill);
    } else if (ai_ml.some(a => skill.includes(a) || a.includes(skill))) {
      categorized.ai_ml.push(skill);
    } else {
      categorized.other.push(skill);
    }
  });
  
  // Remove duplicates within each category
  Object.keys(categorized).forEach(key => {
    categorized[key] = [...new Set(categorized[key])];
  });
  
  return categorized;
}

/**
 * Semantic matching - Check if a skill/term matches any member of a category
 */
export function isSemanticallyRelated(skill, categoryKeywords) {
  if (!skill || !categoryKeywords || categoryKeywords.length === 0) return false;
  
  const lowerSkill = skill.toLowerCase();
  
  // Direct match
  for (const kw of categoryKeywords) {
    const lowerKw = kw.toLowerCase();
    if (lowerSkill.includes(lowerKw) || lowerKw.includes(lowerSkill)) {
      return true;
    }
  }
  
  // Category-based semantic matching
  const skillCategory = SKILL_TO_CATEGORY[lowerSkill];
  if (skillCategory) {
    for (const kw of categoryKeywords) {
      const kwCategory = SKILL_TO_CATEGORY[kw.toLowerCase()];
      if (kwCategory && kwCategory === skillCategory) {
        return true;
      }
    }
  }
  
  // Action verb matching
  for (const [baseVerb, variations] of Object.entries(ACTION_VERBS)) {
    if (variations.some(v => lowerSkill.includes(v))) {
      for (const kw of categoryKeywords) {
        if (ACTION_VERBS[baseVerb]?.some(v => kw.toLowerCase().includes(v))) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Get all skills related to a category
 */
export function getCategorySkills(category) {
  return SKILL_CATEGORIES[category.toLowerCase()] || [];
}

/**
 * Check if text contains any skill variations
 */
export function containsSkillVariations(text, skills) {
  if (!text || !skills || skills.length === 0) return [];
  
  const lowerText = text.toLowerCase();
  const matched = [];
  
  for (const skill of skills) {
    const skillCategory = SKILL_TO_CATEGORY[skill.toLowerCase()];
    
    // Check direct inclusion
    if (lowerText.includes(skill.toLowerCase())) {
      matched.push(skill);
      continue;
    }
    
    // Check category variations
    if (skillCategory) {
      const variations = SKILL_CATEGORIES[skillCategory] || [];
      for (const variation of variations) {
        if (lowerText.includes(variation)) {
          matched.push(skill);
          break;
        }
      }
    }
    
    // Check action verbs that indicate the skill
    if (!matched.includes(skill)) {
      for (const [baseVerb, variations] of Object.entries(ACTION_VERBS)) {
        for (const variation of variations) {
          if (lowerText.includes(variation)) {
            matched.push(skill);
            break;
          }
        }
        if (matched.includes(skill)) break;
      }
    }
  }
  
  return [...new Set(matched)];
}