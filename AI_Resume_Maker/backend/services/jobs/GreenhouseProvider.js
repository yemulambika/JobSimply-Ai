import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class GreenhouseProvider extends BaseJobProvider {
  constructor() {
    super('greenhouse');
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    if (!query) return [];
    // Search via Greenhouse API for a curated list of boards that allow public access
    const response = await axios.get('https://boards-api.greenhouse.io/v1/boards', {
      params: { q: query },
    });
    const boards = response.data.boards || [];
    const jobs = [];
    for (const board of boards) {
      try {
        const boardResponse = await axios.get(board.url + '?query=' + encodeURIComponent(query));
        const boardJobs = boardResponse.data.jobs || [];
        jobs.push(...boardJobs);
      } catch (err) {
        // skip board on failure
      }
    }
    return jobs;
  }

  normalizeJob(raw) {
    const base = this.buildNormalizedJob(raw);
    return {
      ...base,
      title: raw.title || base.title,
      company: raw.company_name || raw.company?.name || base.company,
      location: raw.locations?.[0]?.name || raw.location || base.location,
      description: raw.content || raw.description || base.description,
      url: raw.absolute_url || raw.url || base.url,
      source: this.name,
    };
  }
}