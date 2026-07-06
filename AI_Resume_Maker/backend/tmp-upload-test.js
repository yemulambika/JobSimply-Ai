const http = require('http');
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'uploads', 'sample.pdf');
const fileBuffer = fs.readFileSync(filePath);
const boundary = '----resume-boundary';
const header = '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="file"; filename="sample.pdf"\r\n' +
  'Content-Type: application/pdf\r\n' +
  '\r\n';
const footer = '\r\n--' + boundary + '--\r\n';
const body = Buffer.concat([Buffer.from(header, 'utf8'), fileBuffer, Buffer.from(footer, 'utf8')]);

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/resumes/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length,
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhdXRoQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIifQ.6Y21A1f82A8sSCexs41p2U5Ajd1gx0pR9LJDH0S3FzY'
  }
}, (res) => {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(data);
  });
});

req.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

req.write(body);
req.end();
