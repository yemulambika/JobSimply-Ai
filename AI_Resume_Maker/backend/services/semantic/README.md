# Semantic ATS Engine

A production-ready semantic similarity-based ATS (Applicant Tracking System) engine that uses sentence-transformer embeddings and pgvector for intelligent resume-job matching.

## Overview

The Semantic ATS Engine eliminates exact keyword matching by using sentence-transformer embeddings to compute semantic similarity between resumes and job descriptions. It stores embeddings in PostgreSQL with pgvector for efficient vector similarity search.

## Key Features

- **Semantic Similarity**: Uses sentence-transformers (all-MiniLM-L6-v2) for 384-dimensional embeddings
- **Modular Architecture**: Embedding models, scoring weights, and recommendation logic are independent
- **Explainable Scoring**: Every score shows how it was calculated and which resume sections affected it
- **Gap Analysis**: Provides matched, missing, and recommended skills with explanations
- **Factual Accuracy**: Tailoring edits only structured JSON, never invents experience or skills
- **Transparent Attribution**: Each section's contribution to the total score is clearly shown
- **pgvector Integration**: Efficient vector similarity search in PostgreSQL

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Semantic ATS Engine                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ EmbeddingService │──────│ SimilarityService│            │
│  │                  │      │                  │            │
│  │ - sentence-trans │      │ - Cosine Similar │            │
│  │   formers        │      │ - Euclidean Dist │            │
│  │ - 384-dim vectors│      │ - Vector Search  │            │
│  └──────────────────┘      └──────────────────┘            │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      │                                       │
│           ┌──────────▼──────────────┐                       │
│           │   SemanticATSEngine     │                       │
│           │                          │                       │
│           │ - Skills Matching       │                       │
│           │ - Experience Matching    │                       │
│           │ - Projects Matching     │                       │
│           │ - Education Matching    │                       │
│           │ - Gap Analysis          │                       │
│           └──────────┬──────────────┘                       │
│                      │                                       │
│           ┌──────────▼──────────────┐                       │
│           │ ResumeTailoringService  │                       │
│           │                          │                       │
│           │ - JSON-only editing     │                       │
│           │ - Factual accuracy      │                       │
│           │ - Validation            │                       │
│           └──────────────────────────┘                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Database Setup

Run the pgvector migration script:

```bash
psql -U your_user -d your_database -f migrations/add_pgvector_support.sql
```

This will:
- Enable the pgvector extension
- Add vector columns to Resume and Job tables
- Create ivfflat indexes for efficient similarity search

### 2. Install Dependencies

```bash
npm install @xenova/transformers
```

### 3. Configuration

No additional configuration required. The embedding model is downloaded automatically on first use.

## API Endpoints

### Analyze Resume

**POST** `/semantic-ats/analyze`

Analyzes a resume against a job description using semantic similarity.

**Request Body:**
```json
{
  "resumeId": 1,
  "jobId": 5,
  "jobDescription": "Senior React Developer with 5+ years experience...",
  "jobTitle": "Senior React Developer",
  "company": "Tech Corp"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "atsScore": 78,
    "scores": {
      "skills": {
        "score": 85,
        "reason": "Weight: 35% of total score. Matched 8 skills: React, TypeScript, Node.js, JavaScript, AWS, Docker, PostgreSQL, GraphQL. Missing 2 skills: Kubernetes, Redis. Weight: 35% of total score",
        "weight": 35,
        "contribution": 30
      },
      "experience": {
        "score": 72,
        "reason": "Weight: 25% of total score. Total experience: 4 years. Gap: 1 year to requirements. Semantic similarity: 68%",
        "weight": 25,
        "contribution": 18
      },
      "projects": {
        "score": 80,
        "reason": "Weight: 15% of total score. 3 relevant projects. Semantic similarity: 75%",
        "weight": 15,
        "contribution": 12
      },
      "education": {
        "score": 90,
        "reason": "Weight: 10% of total score. Education relevant: Yes. Semantic similarity: 85%",
        "weight": 10,
        "contribution": 9
      },
      "responsibilities": {
        "score": 65,
        "reason": "Weight: 10% of total score. 4 responsibilities matched. Semantic similarity: 60%",
        "weight": 10,
        "contribution": 7
      },
      "keywords": {
        "score": 70,
        "reason": "Weight: 5% of total score. Semantic similarity: 70%",
        "weight": 5,
        "contribution": 4
      }
    },
    "details": {
      "totalYears": 4,
      "experienceGap": 1,
      "matchedSkills": ["React", "TypeScript", "Node.js"],
      "missingSkills": ["Kubernetes", "Redis"],
      "recommendedSkills": [
        {
          "missing": "Kubernetes",
          "considerAdding": "Docker",
          "reason": "Similar to your existing skill (75% match)"
        }
      ],
      "matchedProjects": [...],
      "missingTechnologies": ["Kubernetes"],
      "educationRelevant": true,
      "matchedResponsibilities": [...],
      "missingResponsibilities": [...]
    },
    "gapAnalysis": {
      "skills": {
        "matched": ["React", "TypeScript", "Node.js"],
        "missing": ["Kubernetes", "Redis"],
        "recommended": [...]
      },
      "experience": {
        "totalYears": 4,
        "requiredYears": 5,
        "gap": 1,
        "recommendation": "Consider highlighting more relevant experience or projects to compensate for 1 year gap"
      },
      "projects": {
        "matchedCount": 3,
        "missingTechnologies": ["Kubernetes"],
        "recommendation": "Consider adding projects with: Kubernetes"
      }
    },
    "weights": {
      "skills": 35,
      "experience": 25,
      "projects": 15,
      "education": 10,
      "responsibilities": 10,
      "keywords": 5
    }
  }
}
```

### Tailor Resume

**POST** `/semantic-ats/tailor`

Tailors a resume for a specific job using semantic analysis. Only edits structured JSON, never PDF.

**Request Body:**
```json
{
  "resumeId": 1,
  "jobId": 5,
  "jobDescription": "Senior React Developer...",
  "jobTitle": "Senior React Developer",
  "company": "Tech Corp",
  "options": {
    "tailorSummary": true,
    "reorderSkills": true,
    "reorderExperience": true,
    "reorderProjects": true,
    "addKeywords": true,
    "tone": "professional",
    "optimization": "balanced"
  }
}
```

**Response:**
```json
{
  "success": true,
  "tailored": {
    "id": 123,
    "title": "Semantic Tailored for Tech Corp",
    "content": "{...tailored resume JSON...}",
    "atsScore": 82,
    "matchScore": 78
  },
  "changes": [
    {
      "section": "summary",
      "type": "modified",
      "original": "Software developer with experience...",
      "tailored": "Experienced in React, TypeScript, and Node.js. Software developer with experience...",
      "reason": "Added job-relevant keywords from existing skills"
    },
    {
      "section": "skills",
      "type": "reordered",
      "reason": "Prioritized skills that match job requirements"
    }
  ],
  "analysis": {...},
  "validation": {
    "valid": true,
    "errors": []
  }
}
```

### Generate Resume Embeddings

**POST** `/semantic-ats/embeddings/generate`

Generates and stores semantic embeddings for a resume.

**Request Body:**
```json
{
  "resumeId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Embeddings generated and saved",
  "sections": ["skills", "experience", "education", "projects", "summary"]
}
```

### Generate Job Embeddings

**POST** `/semantic-ats/embeddings/job`

Generates and stores semantic embeddings for a job.

**Request Body:**
```json
{
  "jobId": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job embeddings generated and saved",
  "sections": ["skills", "description", "responsibilities"]
}
```

### Find Similar Jobs

**GET** `/semantic-ats/similar-jobs?resumeId=1&limit=10`

Finds jobs similar to a resume using vector similarity search.

**Response:**
```json
{
  "success": true,
  "similarJobs": [
    {
      "id": 5,
      "title": "Senior React Developer",
      "company": "Tech Corp",
      "similarityScore": 85
    },
    ...
  ]
}
```

## Scoring Weights

The scoring system uses configurable weights (can be adjusted in `SemanticATSEngine.js`):

| Section | Weight | Description |
|---------|--------|-------------|
| Skills | 35% | Skill matching using semantic similarity |
| Experience | 25% | Experience relevance and years |
| Projects | 15% | Project relevance and technologies |
| Education | 15% | Education relevance to job |
| Responsibilities | 10% | Responsibility overlap |
| Keywords | 5% | Keyword presence in resume |

## Similarity Thresholds

- **High Match**: ≥ 0.8 (80%)
- **Medium Match**: ≥ 0.6 (60%)
- **Low Match**: ≥ 0.4 (40%)

## Factual Accuracy Guarantees

The tailoring service ensures:

1. **No New Experience**: Never adds new experience entries
2. **No New Skills**: Never invents skills not present in original resume
3. **No New Projects**: Never adds new project entries
4. **No New Education**: Never adds new education entries
5. **Validation**: Every tailoring operation is validated before saving

## Modular Design

### Embedding Models

The embedding model can be swapped by changing the model name in `EmbeddingService.js`:

```javascript
this.modelName = 'Xenova/all-MiniLM-L6-v2'; // Current
// Change to: 'Xenova/all-mpnet-base-v2' for better accuracy
```

### Scoring Weights

Weights can be customized per instance:

```javascript
const customWeights = {
  skills: 40,
  experience: 30,
  projects: 10,
  education: 10,
  responsibilities: 5,
  keywords: 5,
};
const engine = new SemanticATSEngine(customWeights);
```

### Similarity Metrics

The similarity metric can be changed from cosine to Euclidean:

```javascript
const similarity = this.similarityService.computeSimilarity(
  embeddingA, 
  embeddingB, 
  'euclidean' // or 'cosine'
);
```

## Performance Considerations

- **First Load**: The embedding model (~100MB) is downloaded on first use
- **Caching**: Models are cached locally after download
- **Batch Processing**: Use `embedBatch()` for multiple texts
- **Vector Indexes**: pgvector ivfflat indexes provide O(log n) search

## Troubleshooting

### Model Download Fails

If the model download fails, check:
- Internet connection
- Disk space (need ~200MB for model cache)
- Firewall settings

### pgvector Extension Not Found

Run the migration script:
```bash
psql -U your_user -d your_database -f migrations/add_pgvector_support.sql
```

### Embeddings Not Generated

Ensure the resume/job has valid JSON structure with the required fields:
- `skills` (object with categories)
- `experience` (array)
- `education` (array)
- `projects` (array)
- `summary` (string)

## Testing

Test the semantic ATS engine with sample data:

```bash
# Generate embeddings for a resume
curl -X POST http://localhost:3000/semantic-ats/embeddings/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resumeId": 1}'

# Analyze resume against job
curl -X POST http://localhost:3000/semantic-ats/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resumeId": 1, "jobId": 5}'

# Tailor resume
curl -X POST http://localhost:3000/semantic-ats/tailor \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resumeId": 1, "jobId": 5}'
```

## License

MIT
