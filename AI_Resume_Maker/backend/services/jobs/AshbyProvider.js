import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class AshbyProvider extends BaseJobProvider {
  constructor() {
    super('ashby');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    // Ashby public API
    const response = await axios.get('https://api.ashby.ai/v1/jobs/search', {
      params: { q: query, location: location || undefined, remote: remoteOnly || undefined },
    });
    return response.data.jobs || [];
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.title || base.title,
      company: raw.companyName || raw.company?.name || base.company,
      location: raw.location || base.location,
      description: raw.description || raw.content || base.description,
      url: raw.url || raw.applyUrl || base.url,
      source: this.name,
    };
  }
}