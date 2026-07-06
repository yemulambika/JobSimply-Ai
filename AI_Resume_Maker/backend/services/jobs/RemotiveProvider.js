import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class RemotiveProvider extends BaseJobProvider {
  constructor() {
    super('remotive');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    const response = await axios.get('https://remotive.com/api/remote-jobs', {
      params: {
        search: query,
        limit: 50,
      },
      timeout: 10000,
    });
    return response.data?.jobs || [];
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.title || base.title,
      company: raw.company_name || base.company,
      location: raw.candidate_required_location || raw.location || 'Remote',
      description: raw.description || base.description,
      url: raw.url || base.url,
      salary: raw.salary || base.salary,
      employmentType: raw.job_type || base.employmentType,
      isRemote: true, // Remotive only has remote jobs
      source: this.name,
      skills: raw.tags || [],
    };
  }
}