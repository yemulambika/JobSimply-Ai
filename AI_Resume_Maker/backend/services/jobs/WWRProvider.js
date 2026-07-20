/**
 * We Work Remotely (WWR) Provider — HTML/RSS scraper
 * Scrapes the public RSS feed at https://weworkremotely.com/remote-jobs.rss
 * No API key required. Uses cheerio for XML parsing.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseJobProvider } from './BaseJobProvider.js';

const FEED_URLS = [
  'https://weworkremotely.com/categories/remote-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
];

export class WWRProvider extends BaseJobProvider {
  constructor() {
    super('weworkremotely');
  }

  async searchJobs(query = '', location = '', remoteOnly = false) {
    const results = await Promise.allSettled(
      FEED_URLS.map(url => this._fetchFeed(url))
    );

    let allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    if (query) {
      const q = query.toLowerCase();
      allJobs = allJobs.filter(j =>
        (j._title || '').toLowerCase().includes(q) ||
        (j._company || '').toLowerCase().includes(q)
      );
    }

    return allJobs;
  }

  async _fetchFeed(feedUrl) {
    const response = await axios.get(feedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'JobAggregator/1.0 (background-service)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      responseType: 'text',
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const jobs = [];

    $('item').each((_, el) => {
      const item = $(el);

      // Title format: "Company: Job Title" — split on first ":"
      const rawTitle = item.find('title').text().trim();
      const colonIdx = rawTitle.indexOf(':');
      const company = colonIdx > -1 ? rawTitle.slice(0, colonIdx).trim() : 'Unknown';
      const title   = colonIdx > -1 ? rawTitle.slice(colonIdx + 1).trim() : rawTitle;

      const link    = item.find('link').next().text().trim() || item.find('guid').text().trim();
      const pubDate = item.find('pubDate').text().trim();
      const region  = item.find('region').text().trim() || 'Worldwide';

      if (!title || title.toLowerCase() === 'via we work remotely') return;

      jobs.push({ _title: title, _company: company, _link: link, _pubDate: pubDate, _region: region });
    });

    return jobs;
  }

  normalizeJob(raw) {
    return {
      title: raw._title || 'Unknown Title',
      company: raw._company || 'Unknown Company',
      location: raw._region || 'Remote',
      description: '',
      url: raw._link || null,
      application_url: raw._link || null,
      source: this.name,
      date_fetched: raw._pubDate ? new Date(raw._pubDate).toISOString() : new Date().toISOString(),
      salary: null,
      employmentType: 'Full-time',
      isRemote: true,
      skills: [],
      benefits: [],
    };
  }
}
