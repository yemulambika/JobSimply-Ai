# JobSimply Architecture - Final

## Complete Workflow

```
Website Login → BroadcastChannel('LOGIN') → Content script → AUTH_UPDATED → Popup
    ↓
Open Naukri job → Content script extracts job → Popup PINGs → GET_CURRENT_JOB
    ↓
POST /api/jobs/extract → Backend validates → Stores job → Returns analysis
    ↓
Popup shows job info → User clicks Customize Resume → Opens /jobs/:id
    ↓
Website shows comparison → User clicks Generate Tailored Resume
    ↓
Generate Cover Letter → Download PDF → Return to Jobs
```

## Extension Authentication

**NO login screen in popup.**

### Flow
```
[POPUP] Sending PING
[CONTENT] Received PING → sends AUTH_UPDATED
[POPUP] Received AUTH_UPDATED → switches to dashboard
```

### BroadcastChannel Integration (website must post)
```javascript
// On login success in React app:
const channel = new BroadcastChannel('jobsimply-auth');
channel.postMessage({ type: 'LOGIN', token: jwt });

// On logout in React app:
channel.postMessage({ type: 'LOGOUT' });
```

## Backend Error Structure

All endpoints return structured errors:
```json
{
  "success": false,
  "stage": "auth|validation|database|unknown",
  "error": "Description of error",
  "details": "Stack trace (dev only)"
}
```

### /api/jobs/extract Flow

1. **Auth check** - Return 401 if no JWT
2. **Validation** - Return 400 if title/company missing
3. **Database** - Save job with analysis
4. **Response** - Always return 200 with structured data

### Response Format
```json
{
  "success": true,
  "jobId": 123,
  "extractedJob": { "title", "company", "location", "description", "source" },
  "matchScore": 75,
  "atsScore": 65,
  "missingSkills": ["react", "aws"],
  "matchingSkills": ["javascript", "python"]
}
```

## Truthful Resume Constraints

**NEVER MODIFIED:**
- Name, Phone, Email, Education, Company names, Employment dates, Certifications

**CAN MODIFY:**
- Skills (reorder + add job-mentioned), Projects (reorder), Experience bullets (reword), Summary

## Acceptance Tests

✓ TEST 1: Not logged in → Popup shows "Open JobSimply"
✓ TEST 2: Login website → Popup updates automatically
✓ TEST 3: Close/reopen popup → Dashboard appears
✓ TEST 4: Open Naukri job → POST /api/jobs/extract returns 200
✓ TEST 5: No 500 errors, structured error responses
✓ TEST 6: Logout website → Popup shows "Open JobSimply" immediately