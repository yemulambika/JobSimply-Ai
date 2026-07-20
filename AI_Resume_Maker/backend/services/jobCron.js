/**
 * Job Fetcher — Background Cron Service
 *
 * Runs every 6 hours and fetches jobs from three free sources:
 *   1. Arbeitnow   — JSON API, no key, general tech jobs
 *   2. RemoteOK    — JSON API, no key, remote-only
 *   3. We Work Remotely — RSS feed scrape via cheerio
 *
 * All results are normalised into the same shape and saved via upsertJob()
 * which uses ON CONFLICT to avoid duplicates.
 *
 * To add a new source: create a Provider class that extends BaseJobProvider,
 * import it here, and add it to the BROWSE_PROVIDERS array.
 */
import cron from 'node-cron';
import { ArbeitnowProvider } from './jobs/ArbeitnowProvider.js';
import { RemoteOKProvider }  from './jobs/RemoteOKProvider.js';
import { WWRProvider }       from './jobs/WWRProvider.js';
import { upsertJob }         from './jobs/JobStorage.js';

// ─── Providers that work WITHOUT a search query (browse-mode) ────────────────
const BROWSE_PROVIDERS = [
  new ArbeitnowProvider(),
  new RemoteOKProvider(),
  new WWRProvider(),
];

// ─── Core fetch logic ────────────────────────────────────────────────────────

/**
 * Fetch from all providers in parallel, then persist every job.
 * If one provider throws, the others continue (Promise.allSettled).
 *
 * @param {string} [query=''] - Optional keyword filter (empty = fetch everything)
 * @returns {{ saved: number, failed: string[], sources: Object }}
 */
export async function fetchAndSaveJobs(query = '') {
  console.log(`[JobCron] Starting fetch — query="${query || '(browse all)'}"`);
  const startedAt = Date.now();
  const sourceStats = {};
  const failedSources = [];

  // Step 1: Fetch from every provider in parallel
  const providerResults = await Promise.allSettled(
    BROWSE_PROVIDERS.map(provider => provider.fetchJobs(query))
  );

  // Step 2: Collect results, note which providers failed
  let allJobs = [];
  for (let i = 0; i < BROWSE_PROVIDERS.length; i++) {
    const provider = BROWSE_PROVIDERS[i];
    const result   = providerResults[i];

    if (result.status === 'fulfilled') {
      const jobs = result.value;
      sourceStats[provider.name] = jobs.length;
      allJobs = allJobs.concat(jobs);
      console.log(`[JobCron] ${provider.name}: fetched ${jobs.length} jobs`);
    } else {
      failedSources.push(provider.name);
      sourceStats[provider.name] = 0;
      console.error(`[JobCron] ${provider.name}: FAILED —`, result.reason?.message || result.reason);
    }
  }

  // Step 3: Deduplicate by application_url (or title+company)
  const seen = new Set();
  const deduped = allJobs.filter(job => {
    const key = job.url || job.application_url
      ? (job.url || job.application_url)
      : `${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`[JobCron] Total unique jobs to save: ${deduped.length}`);

  // Step 4: Persist to database
  // ─────────────────────────────────────────────────────────────────────────
  // DATABASE SAVE LOGIC — hook your own DB here if needed.
  //
  // Currently uses the project's upsertJob() which runs:
  //   INSERT INTO "Job" (...) ON CONFLICT (title, company, location)
  //   DO UPDATE SET ...
  //
  // To use a different DB (e.g. Supabase, MongoDB), replace the block below:
  //   await supabase.from('jobs').upsert(job, { onConflict: 'application_url' });
  //   await MongoJob.findOneAndUpdate({ application_url: job.url }, job, { upsert: true });
  // ─────────────────────────────────────────────────────────────────────────
  let saved = 0;
  const saveErrors = [];

  await Promise.allSettled(
    deduped.map(async job => {
      try {
        // Map the normalised shape to what upsertJob() expects
        await upsertJob({
          title:          job.title,
          company:        job.company,
          location:       job.location,
          description:    job.description,
          url:            job.url || job.application_url,
          source:         job.source,
          salary:         job.salary,
          employmentType: job.employmentType,
          isRemote:       job.isRemote,
          skills:         job.skills,
          benefits:       job.benefits,
        });
        saved++;
      } catch (err) {
        saveErrors.push({ title: job.title, error: err.message });
        if (saveErrors.length <= 3) {
          console.error(`[JobCron] Save error sample — ${job.title}: ${err.message}`);
        }
      }
    })
  );

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[JobCron] Done — ${saved} saved, ${saveErrors.length} save-errors, ${elapsed}s`);
  if (failedSources.length) {
    console.warn(`[JobCron] Provider failures: ${failedSources.join(', ')}`);
  }

  return { saved, failed: failedSources, sources: sourceStats, elapsed: `${elapsed}s` };
}

// ─── Cron schedule ───────────────────────────────────────────────────────────

/**
 * Start the background cron job.
 * Schedule: every 6 hours — cron "0 * /6 * * *" (spaces added to avoid comment break)
 */
export function startJobCron() {
  const schedule = '0 */6 * * *';

  if (!cron.validate(schedule)) {
    console.error('[JobCron] Invalid cron expression:', schedule);
    return;
  }

  cron.schedule(schedule, async () => {
    console.log(`[JobCron] Scheduled run triggered at ${new Date().toISOString()}`);
    try {
      await fetchAndSaveJobs();
    } catch (err) {
      console.error('[JobCron] Unexpected error during scheduled run:', err);
    }
  });

  console.log(`[JobCron] Cron scheduled: "${schedule}" (every 6 hours)`);

  // Run once immediately on startup so jobs are available right away
  console.log('[JobCron] Running initial fetch on startup…');
  fetchAndSaveJobs().catch(err =>
    console.error('[JobCron] Initial fetch failed:', err.message)
  );
}
