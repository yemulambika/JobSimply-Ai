import axios from 'axios';

try {
  const response = await axios.get('https://remotive.com/api/remote-jobs', {
    params: { search: 'developer' },
    timeout: 10000
  });
  console.log('Status:', response.status);
  console.log('Job Count:', response.data?.job_count);
  console.log('Sample Jobs:', JSON.stringify(response.data?.jobs?.slice(0, 3), null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Response:', error.response?.data);
}