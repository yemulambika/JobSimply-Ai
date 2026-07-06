# JobSimply Browser Extension

A Chrome/Firefox extension that acts as a companion to the JobSimply AI Resume Maker platform.

## Features

- **Job Detection**: Automatically detects job pages on LinkedIn, Naukri, Wellfound, Greenhouse, Lever, Workday, Ashby, and SmartRecruiters
- **Job Analysis**: Extracts job details and sends them to the backend for ATS scoring and skill matching
- **Autofill**: Populates application forms with your profile data (name, email, phone, etc.)
- **Loop Queue**: Add jobs to your application tracking queue in the backend

## Installation

1. Build the extension:
   ```bash
   cd AI_Resume_Maker/extension
   ```

2. Load the extension in Chrome:
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

3. Configure the backend URL in extension settings (default: `http://localhost:5000`)

## API Endpoints

The extension communicates with the backend through these endpoints:

- `POST /api/jobs/analyze` - Analyze job for ATS score and skill match
- `POST /api/loop` - Add job to user's Loop queue
- `GET /profile` - Get user profile for autofill
- `POST /auth/login` - Authentication

## File Structure

```
extension/
├── manifest.json      # Extension configuration (Manifest V3)
├── background/
│   └── background.js  # Service worker for API requests
├── content/
│   ├── content.js     # Job extraction script
│   └── content.css    # Content script styles
├── popup/
│   ├── popup.html     # Popup UI
│   ├── popup.js       # Popup logic
│   └── popup.css      # Popup styles
├── options/
│   ├── options.html   # Settings page
│   ├── options.js     # Settings logic
│   └── options.css    # Settings styles
└── icons/             # Extension icons (16x16, 48x48, 128x128)
```

## Supported Sites

| Site | Job Selection |
|------|---------------|
| LinkedIn | `.jobs-unified-top-card__job-title` |
| Naukri | `.jd-header-title h1` |
| Wellfound | `[data-test="JobTitle"]` |
| Greenhouse | `.opening-title` |
| Lever | `.posting-header h2` |
| Workday | `[data-automation-id="jobTitle"]` |
| Ashby | `.job-title` |
| SmartRecruiters | `.job-title` |

## Security

- Uses JWT authentication
- Token stored securely in Chrome storage sync
- No automatic application submission
- User reviews all data before proceeding