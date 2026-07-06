import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class LeverProvider extends BaseJobProvider {
  constructor() {
    super('lever');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    // Lever public API endpoint
    const response = await axios.get('https://api.lever.co/v0/postings', {
      params: { q: query, location: location || undefined },
    });
    return response.data || [];
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.text || raw.title || base.title,
      company: raw.company || base.company,
      location: raw.location || base.location,
      description: raw.description || raw.content || base.description,
      url: raw.hostedUrl || raw.applyUrl || raw.url || base.url,
      source: this.name,
    };
  }
}