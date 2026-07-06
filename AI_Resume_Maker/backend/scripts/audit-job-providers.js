import 'dotenv/config';
import axios from 'axios';

// Mask API key for logging (show last 4 characters)
const maskKey = (key) => key ? `***...${key.slice(-4)}` : 'NOT SET';

async function auditProvider(name, apiKey, apiKeyValue, testUrl, testHeaders, queryParams) {
  console.log(`\n=== Provider: ${name} ===`);
  console.log(`API Key Loaded: ${apiKey ? 'YES' : 'NO'}`);
  if (apiKey) {
    console.log(`API Key (masked): ${maskKey(apiKey)}`);
  }
  console.log(`Endpoint URL: ${testUrl}`);
  console.log(`Request Headers:`, JSON.stringify(testHeaders, null, 2));
  console.log(`Query Parameters:`, JSON.stringify(queryParams, null, 2));
  
  try {
    const response = await axios.get(testUrl, {
      headers: testHeaders,
      params: queryParams,
      timeout: 10000
    });
    console.log(`HTTP Status: ${response.status}`);
    const jobs = response.data?.results || response.data?.data || [];
    console.log(`Jobs Returned: ${Array.isArray(jobs) ? jobs.length : 'N/A (check structure)'}`);
    if (jobs && jobs.length > 0) {
      console.log(`Sample Job:`, JSON.stringify(jobs[0], null, 2));
    }
  } catch (error) {
    console.log(`HTTP Status: ${error.response?.status || 'Network Error'}`);
    console.log(`Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`Response Body:`, typeof error.response.data === 'string' ? error.response.data.slice(0, 500) : JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function main() {
  console.log('=== Job Providers Audit ===\n');
  
  // Adzuna
  await auditProvider(
    'Adzuna',
    process.env.ADZUNA_APP_ID,
    process.env.ADZUNA_APP_KEY,
    'https://api.adzuna.com/v1/api/jobs/us/search/1',
    {},
    {
      app_id: process.env.ADZUNA_APP_ID,
      app_key: process.env.ADZUNA_APP_KEY,
      q: 'developer',
      results_per_page: 10
    }
  );

  // JSearch
  await auditProvider(
    'JSearch',
    process.env.RAPIDAPI_KEY,
    null,
    'https://jsearch.p.rapidapi.com/search',
    {
      'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY
    },
    {
      query: 'developer',
      page: '1',
      num_pages: '1'
    }
  );

  // Ashby
  await auditProvider(
    'Ashby',
    null, // No API key needed for public API
    null,
    'https://api.ashby.ai/v1/jobs/search',
    {},
    {
      q: 'developer',
      location: '',
      remote: false
    }
  );

  // Greenhouse
  await auditProvider(
    'Greenhouse',
    null, // No API key needed for public API
    null,
    'https://api.greenhouse.io/v1/jobs',
    {},
    {
      query: 'developer'
    }
  );

  // Lever
  await auditProvider(
    'Lever',
    null, // No API key needed for public API
    null,
    'https://api.lever.co/v0/postings',
    {},
    {
      team: 'engineering',
      query: 'developer'
    }
  );
}

main().catch(console.error);