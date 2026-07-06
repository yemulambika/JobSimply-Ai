import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class AdzunaProvider extends BaseJobProvider {
  constructor() {
    super('adzuna');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      console.warn('Adzuna credentials missing');
      return [];
    }
    const country = 'us';
    const response = await axios.get(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`, {
      params: {
        app_id: appId,
        app_key: appKey,
        q: query,
        location: location || undefined,
        remote: remoteOnly ? 1 : undefined,
        results_per_page: 50,
      },
    });
    return response.data.results || [];
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.title || base.title,
      company: raw.company?.display_name || raw.company?.name || base.company,
      location: raw.location?.display_name || raw.location?.name || base.location,
      description: raw.description || base.description,
      url: raw.redirect_url || raw.url || base.url,
      salary: raw.salary_min && raw.salary_max ? `$${raw.salary_min} - $${raw.salary_max}` : base.salary,
      employmentType: raw.contract_type || base.employmentType,
      isRemote: !!raw.remote,
      source: this.name,
    };
  }
}