/**
 * Arbeitnow Provider
 * Free public API — no key required, supports browse without a search query.
 * Docs: https://www.arbeitnow.com/api/job-board-api
 */
import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class ArbeitnowProvider extends BaseJobProvider {
  constructor() {
    super('arbeitnow');
  }

  /**
   * Fetch jobs from Arbeitnow.
   * When called from the cron (no query) we pull the latest page of listings.
   * When called with a query we filter client-side (the API has no search param).
   */
  async searchJobs(query = '', location = '', remoteOnly = false) {
    const pages = query ? 1 : 3; // Pull more pages for background fetches
    let allJobs = [];

    for (let page = 1; page <= pages; page++) {
      const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
        params: { page },
        timeout: 15000,
        headers: { 'Accept': 'application/json' },
      });
      const jobs = response.data?.data || [];
      allJobs = allJobs.concat(jobs);
    }

    // Apply optional client-side filters when a query is supplied
    if (query) {
      const q = query.toLowerCase();
      allJobs = allJobs.filter(j =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q)
      );
    }
    if (location) {
      const loc = location.toLowerCase();
      allJobs = allJobs.filter(j =>
        (j.location || '').toLowerCase().includes(loc)
      );
    }
    if (remoteOnly) {
      allJobs = allJobs.filter(j => j.remote);
    }

    return allJobs;
  }

  normalizeJob(raw) {
    return {
      title: raw.title || 'Unknown Title',
      company: raw.company_name || 'Unknown Company',
      location: raw.location || 'Remote',
      description: raw.description || '',
      // Canonical field the DB stores as "url"
      url: raw.url || null,
      // User-requested alias — same value
      application_url: raw.url || null,
      source: this.name,
      date_fetched: new Date().toISOString(),
      salary: null,
      employmentType: (raw.job_types || []).join(', ') || null,
      isRemote: !!raw.remote,
      skills: raw.tags || [],
      benefits: [],
    };
  }
}
