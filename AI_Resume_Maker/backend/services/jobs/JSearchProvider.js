import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class JSearchProvider extends BaseJobProvider {
  constructor() {
    super('jsearch');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    const host = 'jsearch.p.rapidapi.com';
    const RapidAPIKey = process.env.RAPIDAPI_KEY;
    if (!RapidAPIKey) {
      console.warn('RapidAPI key missing for JSearch');
      return [];
    }
    const response = await axios.get(`https://${host}/search`, {
      params: {
        query: `${query} ${location}`.trim(),
        remote: remoteOnly ? 'true' : undefined,
        page: '1',
        num_pages: '1',
      },
      headers: {
        'x-rapidapi-host': host,
        'x-rapidapi-key': RapidAPIKey,
      },
    });
    return response.data?.data || [];
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.job_title || base.title,
      company: raw.employer_name || base.company,
      location: raw.location || base.location,
      description: raw.job_description || base.description,
      url: raw.job_apply_link || raw.url || base.url,
      salary: raw.salary_min || raw.salary_max ? `${raw.salary_min || ''} - ${raw.salary_max || ''}` : base.salary,
      employmentType: raw.job_employment_type || base.employmentType,
      isRemote: !!raw.is_remote,
      source: this.name,
    };
  }
}