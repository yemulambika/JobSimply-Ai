export class BaseJobProvider {
  constructor(name) {
    this.name = name;
  }

  async searchJobs(query, location = '', remoteOnly = false) {
    throw new Error('searchJobs() must be implemented by subclass');
  }

  normalizeJob(raw) {
    throw new Error('normalizeJob() must be implemented by subclass');
  }

  async fetchJobs(query, location = '', remoteOnly = false) {
    try {
      const rawJobs = await this.searchJobs(query, location, remoteOnly);
      return rawJobs.map(job => this.normalizeJob(job));
    } catch (error) {
      console.error(`Error fetching jobs from ${this.name}:`, error.message);
      return [];
    }
  }

  buildNormalizedJob(raw) {
    return {
      title: raw.title || null,
      company: raw.company || null,
      location: raw.location || null,
      description: raw.description || null,
      url: raw.url || null,
      source: this.name,
      salary: raw.salary || null,
      employmentType: raw.employmentType || null,
      isRemote: !!raw.isRemote,
      skills: raw.skills || [],
      benefits: raw.benefits || [],
    };
  }
}