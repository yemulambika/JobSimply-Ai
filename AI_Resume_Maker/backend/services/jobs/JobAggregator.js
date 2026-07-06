import { GreenhouseProvider } from './GreenhouseProvider.js';
import { LeverProvider } from './LeverProvider.js';
import { AshbyProvider } from './AshbyProvider.js';
import { AdzunaProvider } from './AdzunaProvider.js';
import { JSearchProvider } from './JSearchProvider.js';
import { RemotiveProvider } from './RemotiveProvider.js';
import { upsertJob } from './JobStorage.js';

const providers = [
  new RemotiveProvider(), // Working public API - first priority
  new GreenhouseProvider(),
  new LeverProvider(),
  new AshbyProvider(),
  new AdzunaProvider(),
  new JSearchProvider(),
];

export async function aggregateJobs(query, location = '', remoteOnly = false) {
  const results = await Promise.all(
    providers.map(provider => provider.fetchJobs(query, location, remoteOnly))
  );
  const flat = results.flat();
  const seen = new Set();
  const deduped = [];
  for (const job of flat) {
    const key = `${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}|${(job.location || '').toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(job);
    }
  }
  for (const job of deduped) {
    await upsertJob(job);
  }
  return deduped;
}