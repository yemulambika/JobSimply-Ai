/**
 * RemoteOK Provider
 * Free public API — no key required. Returns remote-only listings.
 * Docs: https://remoteok.com/api
 *
 * NOTE: The API returns an array where index 0 is a legal notice object,
 * not a job. Real jobs start at index 1.
 */
import axios from 'axios';
import { BaseJobProvider } from './BaseJobProvider.js';

export class RemoteOKProvider extends BaseJobProvider {
  constructor() {
    super('remoteok');
  }

  async searchJobs(query = '', location = '', remoteOnly = false) {
    const response = await axios.get('https://remoteok.com/api', {
      timeout: 15000,
      headers: {
        // RemoteOK requires a User-Agent that isn't a browser to avoid rate-limits
        'User-Agent': 'JobAggregator/1.0 (background-service)',
        'Accept': 'application/json',
      },
    });

    // Skip index 0 (legal metadata object)
    let jobs = (response.data || []).slice(1);

    if (query) {
      const q = query.toLowerCase();
      jobs = jobs.filter(j =>
        (j.position || '').toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q) ||
        (j.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    return jobs;
  }

  normalizeJob(raw) {
    const salary = raw.salary_min && raw.salary_max
      ? `$${raw.salary_min}–$${raw.salary_max}`
      : raw.salary_min
        ? `From $${raw.salary_min}`
        : null;

    return {
      title: raw.position || 'Unknown Title',
      company: raw.company || 'Unknown Company',
      location: raw.location || 'Remote',
      description: raw.description || '',
      url: raw.url || null,
      application_url: raw.url || null,
      source: this.name,
      date_fetched: raw.date && !isNaN(Number(raw.date)) ? new Date(Number(raw.date) * 1000).toISOString() : new Date().toISOString(),
      salary,
      employmentType: 'Full-time',
      isRemote: true,
      skills: raw.tags || [],
      benefits: [],
    };
  }
}
