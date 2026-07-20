/**
 * Embedding Service - Generates semantic embeddings using sentence-transformers
 * Uses @xenova/transformers for in-browser/Node.js transformer models
 * Modular design: can swap embedding models without changing the interface
 */

import { pipeline, env } from '@xenova/transformers';

// Configure transformers to use local cache
env.allowLocalModels = false;
env.useBrowserCache = false;

class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2'; // 384-dimensional embeddings
    this.isInitialized = false;
  }

  /**
   * Initialize the embedding model
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('[EmbeddingService] Loading model:', this.modelName);
      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for faster inference
      });
      this.isInitialized = true;
      console.log('[EmbeddingService] Model loaded successfully');
    } catch (error) {
      console.error('[EmbeddingService] Failed to load model:', error);
      throw new Error(`Failed to initialize embedding model: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Input text
   * @returns {Promise<number[]>} - Embedding vector
   */
  async embedText(text) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    try {
      const output = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to array and ensure it's a flat array
      const embedding = Array.from(output.data);
      return embedding;
    } catch (error) {
      console.error('[EmbeddingService] Failed to embed text:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {string[]} texts - Array of input texts
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async embedBatch(texts) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    try {
      const embeddings = await Promise.all(
        texts.map(text => this.embedText(text))
      );
      return embeddings;
    } catch (error) {
      console.error('[EmbeddingService] Failed to embed batch:', error);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embedding for resume sections
   * @param {object} resumeJSON - Parsed resume JSON
   * @returns {Promise<object>} - Object with embeddings for each section
   */
  async embedResume(resumeJSON) {
    if (!resumeJSON || typeof resumeJSON !== 'object') {
      throw new Error('Resume JSON must be a valid object');
    }

    const sections = {
      skills: this.extractSkillsText(resumeJSON),
      experience: this.extractExperienceText(resumeJSON),
      education: this.extractEducationText(resumeJSON),
      projects: this.extractProjectsText(resumeJSON),
      summary: resumeJSON.summary || '',
    };

    const embeddings = {};
    for (const [section, text] of Object.entries(sections)) {
      if (text && text.length > 0) {
        embeddings[section] = await this.embedText(text);
      }
    }

    return embeddings;
  }

  /**
   * Generate embedding for job description sections
   * @param {object} jobJSON - Parsed job JSON
   * @returns {Promise<object>} - Object with embeddings for each section
   */
  async embedJob(jobJSON) {
    if (!jobJSON || typeof jobJSON !== 'object') {
      throw new Error('Job JSON must be a valid object');
    }

    const sections = {
      skills: this.extractJobSkillsText(jobJSON),
      description: jobJSON.description || '',
      responsibilities: jobJSON.responsibilities || '',
    };

    const embeddings = {};
    for (const [section, text] of Object.entries(sections)) {
      if (text && text.length > 0) {
        embeddings[section] = await this.embedText(text);
      }
    }

    return embeddings;
  }

  /**
   * Extract skills text from resume JSON
   */
  extractSkillsText(resumeJSON) {
    const skills = resumeJSON.skills || {};
    const skillTexts = [];

    for (const [category, skillList] of Object.entries(skills)) {
      if (Array.isArray(skillList)) {
        skillTexts.push(...skillList.map(s => typeof s === 'string' ? s : s.name || s));
      }
    }

    return skillTexts.join(', ');
  }

  /**
   * Extract experience text from resume JSON
   */
  extractExperienceText(resumeJSON) {
    const experience = resumeJSON.experience || [];
    const expTexts = [];

    for (const exp of experience) {
      const parts = [
        exp.designation || exp.title || '',
        exp.company || '',
        exp.description || '',
        ...(exp.bullets || []),
        ...(exp.technologies || []),
      ].filter(Boolean);
      expTexts.push(parts.join(' '));
    }

    return expTexts.join(' ');
  }

  /**
   * Extract education text from resume JSON
   */
  extractEducationText(resumeJSON) {
    const education = resumeJSON.education || [];
    const eduTexts = [];

    for (const edu of education) {
      const parts = [
        edu.degree || '',
        edu.specialization || '',
        edu.college || edu.university || edu.institution || '',
        edu.description || '',
      ].filter(Boolean);
      eduTexts.push(parts.join(' '));
    }

    return eduTexts.join(' ');
  }

  /**
   * Extract projects text from resume JSON
   */
  extractProjectsText(resumeJSON) {
    const projects = resumeJSON.projects || [];
    const projTexts = [];

    for (const proj of projects) {
      const parts = [
        proj.title || '',
        proj.description || '',
        ...(proj.responsibilities || []),
        ...(proj.features || []),
        ...(proj.technologies || []),
      ].filter(Boolean);
      projTexts.push(parts.join(' '));
    }

    return projTexts.join(' ');
  }

  /**
   * Extract skills text from job JSON
   */
  extractJobSkillsText(jobJSON) {
    const skills = [
      ...(jobJSON.requiredSkills || []),
      ...(jobJSON.preferredSkills || []),
    ];

    if (Array.isArray(skills)) {
      return skills.join(', ');
    }

    return '';
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension() {
    return 384; // all-MiniLM-L6-v2 produces 384-dimensional embeddings
  }

  /**
   * Check if service is initialized
   */
  isReady() {
    return this.isInitialized;
  }
}

// Singleton instance
let embeddingServiceInstance = null;

/**
 * Get or create the embedding service singleton
 */
export function getEmbeddingService() {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}

export default EmbeddingService;
