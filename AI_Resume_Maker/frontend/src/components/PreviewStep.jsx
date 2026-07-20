// Dynamic section rendering - render all sections present in data
const SECTION_CONFIG = {
  personalInfo: { label: 'Personal Info', type: 'object' },
  summary: { label: 'Summary', type: 'text' },
  objective: { label: 'Objective', type: 'text' },
  skills: { label: 'Skills', type: 'categorized' },
  experience: { label: 'Experience', type: 'array' },
  internships: { label: 'Internships', type: 'array' },
  projects: { label: 'Projects', type: 'array' },
  education: { label: 'Education', type: 'array' },
  certifications: { label: 'Certifications', type: 'array' },
  achievements: { label: 'Achievements', type: 'array' },
  languages: { label: 'Languages', type: 'array' },
  publications: { label: 'Publications', type: 'array' },
  research: { label: 'Research', type: 'array' },
  volunteering: { label: 'Volunteering', type: 'array' },
  leadership: { label: 'Leadership', type: 'array' },
  links: { label: 'Links', type: 'links' },
  customSections: { label: 'Custom Sections', type: 'custom' },
};

function renderSectionValue(key, value) {
  if (!value) return null;
  
  const config = SECTION_CONFIG[key];
  if (!config) return renderGenericValue(value);
  
  switch (config.type) {
    case 'text':
      return <p className="text-sm text-slate-300">{value}</p>;
    
    case 'links':
      return renderLinks(value);
    
    case 'categorized':
      return renderCategorizedSkills(value);
    
    case 'custom':
      return renderCustomSections(value);
    
    case 'array':
      return renderArraySection(key, value);
    
    case 'object':
      return renderObjectSection(value);
    
    default:
      return renderGenericValue(value);
  }
}

function renderLinks(links) {
  if (!links || typeof links !== 'object') return null;
  
  const linkFields = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'github', label: 'GitHub' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'website', label: 'Website' },
    { key: 'gfg', label: 'GeeksforGeeks' },
    { key: 'scaler', label: 'Scaler' },
    { key: 'medium', label: 'Medium' },
    { key: 'hashnode', label: 'Hashnode' },
    { key: 'devto', label: 'Dev.to' },
    { key: 'kaggle', label: 'Kaggle' },
    { key: 'stackoverflow', label: 'Stack Overflow' },
    { key: 'leetcode', label: 'LeetCode' },
    { key: 'codeforces', label: 'Codeforces' },
    { key: 'codechef', label: 'CodeChef' },
    { key: 'behance', label: 'Behance' },
    { key: 'dribbble', label: 'Dribbble' },
    { key: 'gitlab', label: 'GitLab' },
    { key: 'bitbucket', label: 'Bitbucket' },
    { key: 'twitter', label: 'Twitter' },
  ];
  
  const hasLinks = linkFields.some(f => links[f.key]) || (links.other && links.other.length > 0);
  if (!hasLinks) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {linkFields.filter(f => links[f.key]).map(f => (
        <a key={f.key} href={links[f.key]} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline">
          {f.label}
        </a>
      ))}
      {links.other && links.other.map((url, i) => (
        <a key={`other-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:text-cyan-300 underline">
          {url}
        </a>
      ))}
    </div>
  );
}

function renderCategorizedSkills(skills) {
  if (!skills || typeof skills !== 'object') return null;
  
  // If skills is a flat array
  if (Array.isArray(skills)) {
    return (
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, i) => (
          <span key={i} className="text-sm bg-slate-700 text-slate-300 px-2 py-1 rounded">
            {typeof skill === 'string' ? skill : skill.name || skill}
          </span>
        ))}
      </div>
    );
  }
  
  // If skills is categorized
  const categories = Object.entries(skills).filter(([_, arr]) => Array.isArray(arr) && arr.length > 0);
  if (categories.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {categories.map(([category, skillList]) => (
        <div key={category}>
          <span className="text-xs text-slate-400 capitalize">{category}</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {skillList.map((skill, i) => (
              <span key={i} className="text-sm bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {typeof skill === 'string' ? skill : skill.name || skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderCustomSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return null;
  
  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <div key={i}>
          <h4 className="text-sm font-semibold text-slate-300 mb-1">{section.title}</h4>
          <p className="text-sm text-slate-400">{section.content}</p>
        </div>
      ))}
    </div>
  );
}

function renderArraySection(key, items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-700 rounded-lg p-3 bg-slate-900">
          {renderItemContent(key, item)}
        </div>
      ))}
    </div>
  );
}

function renderItemContent(sectionKey, item) {
  if (typeof item === 'string') {
    return <p className="text-sm text-slate-300">{item}</p>;
  }
  
  // Special rendering for specific sections
  if (sectionKey === 'experience' || sectionKey === 'internships') {
    return (
      <>
        <div className="text-sm font-semibold text-slate-300">{item.designation || item.title || item.role} @ {item.company}</div>
        <div className="text-xs text-slate-400">{item.location && `${item.location} | `}{item.duration || `${item.startDate} - ${item.endDate || 'Present'}`}</div>
        {item.employmentType && <div className="text-xs text-slate-400">{item.employmentType}</div>}
        {item.description && <p className="text-sm text-slate-400 mt-1">{item.description}</p>}
        {item.bullets && item.bullets.length > 0 && (
          <ul className="list-disc pl-5 mt-1">
            {item.bullets.map((bullet, j) => (
              <li key={j} className="text-sm text-slate-400">{bullet}</li>
            ))}
          </ul>
        )}
        {item.technologies && item.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.technologies.map((tech, j) => (
              <span key={j} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tech}</span>
            ))}
          </div>
        )}
      </>
    );
  }
  
  if (sectionKey === 'education') {
    return (
      <>
        <div className="text-sm font-semibold text-slate-300">{item.degree}</div>
        {item.specialization && <div className="text-sm text-slate-400">{item.specialization}</div>}
        <div className="text-sm text-slate-400">{item.college || item.university || item.institution}{item.location && ` | ${item.location}`}</div>
        <div className="text-xs text-slate-400">{item.startYear && item.endYear ? `${item.startYear} - ${item.endYear}` : (item.year || '')}{item.current && ' (Current)'}</div>
        {(item.cgpa || item.percentage) && (
          <div className="text-xs text-slate-400">{item.cgpa && `CGPA: ${item.cgpa}`}{item.cgpa && item.percentage && ' | '}{item.percentage && `Percentage: ${item.percentage}`}</div>
        )}
        {item.description && <p className="text-sm text-slate-400 mt-1">{item.description}</p>}
      </>
    );
  }
  
  if (sectionKey === 'projects') {
    return (
      <>
        <div className="text-sm font-semibold text-slate-300">{item.title}</div>
        {item.description && <p className="text-sm text-slate-400">{item.description}</p>}
        {item.technologies && item.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.technologies.map((tech, j) => (
              <span key={j} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tech}</span>
            ))}
          </div>
        )}
        {(item.github || item.deployment || item.demo) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {item.github && <a href={item.github} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline">GitHub</a>}
            {item.deployment && <a href={item.deployment} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline">Live</a>}
            {item.demo && <a href={item.demo} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline">Demo</a>}
          </div>
        )}
        {item.responsibilities && item.responsibilities.length > 0 && (
          <ul className="list-disc pl-5 mt-1">
            {item.responsibilities.map((resp, j) => (
              <li key={j} className="text-sm text-slate-400">{resp}</li>
            ))}
          </ul>
        )}
        {item.features && item.features.length > 0 && (
          <ul className="list-disc pl-5 mt-1">
            {item.features.map((feat, j) => (
              <li key={j} className="text-sm text-slate-400">{feat}</li>
            ))}
          </ul>
        )}
      </>
    );
  }
  
  if (sectionKey === 'certifications') {
    return (
      <>
        <div className="text-sm font-semibold text-slate-300">{typeof item === 'string' ? item : item.name}</div>
        {typeof item === 'object' && (
          <>
            {item.provider && <div className="text-sm text-slate-400">{item.provider}</div>}
            {(item.issueDate || item.expiry) && (
              <div className="text-xs text-slate-400">{item.issueDate && `Issued: ${item.issueDate}`}{item.issueDate && item.expiry && ' | '}{item.expiry && `Expires: ${item.expiry}`}</div>
            )}
            {item.credentialUrl && (
              <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1 inline-block">View Credential</a>
            )}
          </>
        )}
      </>
    );
  }
  
  // Generic object rendering
  return (
    <div className="space-y-1">
      {Object.entries(item).map(([key, val]) => (
        <div key={key} className="text-sm">
          <span className="font-medium text-slate-300 capitalize">{key}: </span>
          <span className="text-slate-400">
            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderObjectSection(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  return (
    <div className="space-y-1">
      {Object.entries(obj).map(([key, val]) => (
        <div key={key} className="text-sm">
          <span className="font-medium text-slate-300 capitalize">{key}: </span>
          <span className="text-slate-400">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

function renderGenericValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === 'string') {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((item, idx) => (
            <li key={idx} className="text-sm text-slate-300">{item}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, idx) => (
          <div key={idx} className="border border-slate-700 rounded-lg p-3 bg-slate-900">
            {Object.entries(item).map(([key, val]) => (
              <div key={key} className="text-sm">
                <span className="font-medium text-slate-300 capitalize">{key}: </span>
                <span className="text-slate-400">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return renderObjectSection(value);
  }

  return <span className="text-sm text-slate-300">{String(value)}</span>;
}

function safeParse(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return {};
  }
}

export default function PreviewStep({
  tailoredResume,
  previousAts,
  newAts,
  aiChanges = [],
  onSave,
  onDownloadPdf,
  onDownloadDocx,
  onRegenerate,
  onEdit,
  onCompareChanges,
  saving = false,
}) {
  const rawContent = tailoredResume?.tailoredContent || tailoredResume?.content || {};
  const content = typeof rawContent === 'string' ? safeParse(rawContent) : rawContent;
  
  // Dynamically get all sections present in content
  const sections = Object.keys(SECTION_CONFIG).filter(key => {
    const value = content[key];
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">Tailored Resume Preview</h2>
        <p className="text-slate-400">
          Review your optimized resume before saving or downloading.
        </p>
      </div>

      {/* ATS Score Card */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold mb-4">ATS Score Improvement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-center">
            <div className="text-sm text-slate-400 mb-1">Previous ATS</div>
            <div className="text-4xl font-bold text-white">{previousAts ?? 0}%</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-400">↓</div>
            <div className="text-sm text-green-400 font-medium">
              {newAts !== null && newAts !== undefined
                ? `+${Math.max(newAts - (previousAts || 0), 0)}%`
                : 'Processing'}
            </div>
          </div>
          <div className="bg-slate-900 p-4 rounded-lg border border-cyan-700 text-center">
            <div className="text-sm text-cyan-300 mb-1">New ATS</div>
            <div className="text-4xl font-bold text-cyan-400">{newAts ?? 0}%</div>
          </div>
        </div>
      </div>

      {/* AI Changes */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold mb-3">AI Improvements</h3>
        {aiChanges.length > 0 ? (
          <ul className="space-y-2">
            {aiChanges.map((change, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No changes recorded.</p>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Resume Preview */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Resume Preview</h3>
          <div className="bg-white text-slate-900 rounded-lg p-6 shadow-sm max-h-[600px] overflow-y-auto">
            {/* Personal Info Header */}
            {(content.personalInfo?.name || content.name) && (
              <div className="mb-4 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900">{content.personalInfo?.name || content.name}</h1>
                <div className="text-sm text-slate-600 space-x-3">
                  {(content.personalInfo?.email || content.email) && <span>{content.personalInfo?.email || content.email}</span>}
                  {(content.personalInfo?.phone || content.phone) && <span>{content.personalInfo?.phone || content.phone}</span>}
                  {(content.personalInfo?.location || content.location) && <span>{content.personalInfo?.location || content.location}</span>}
                </div>
                {content.links && Object.keys(content.links).length > 0 && (
                  <div className="text-sm text-slate-600 mt-1 space-x-3">
                    {Object.entries(content.links).map(([platform, url]) => (
                      <span key={platform}>
                        {platform}: {String(url)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Render all dynamic sections */}
            {sections.map((key) => {
              const config = SECTION_CONFIG[key];
              if (!config) return null;
              
              return (
                <div key={key} className="mb-5">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2 capitalize border-b border-slate-200 pb-1">
                    {config.label}
                  </h2>
                  <div className="text-sm">{renderSectionValue(key, content[key])}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Actions / details */}
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Resume'}
              </button>
              <button
                onClick={onDownloadPdf}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Download PDF
              </button>
              <button
                onClick={onDownloadDocx}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Download DOCX
              </button>
              <button
                onClick={onRegenerate}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={onEdit}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Edit Resume
              </button>
              <button
                onClick={onCompareChanges}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Compare Changes
              </button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold mb-3">Resume Version</h3>
            <div className="text-sm text-slate-400 space-y-2">
              <div>
                <span className="text-slate-300">Version:</span>{' '}
                {tailoredResume?.version || tailoredResume?.id || 'Latest'}
              </div>
              <div>
                <span className="text-slate-300">Created:</span>{' '}
                {tailoredResume?.createdAt
                  ? new Date(tailoredResume.createdAt).toLocaleString()
                  : 'Just now'}
              </div>
              <div>
                <span className="text-slate-300">Saved:</span>{' '}
                {tailoredResume?.saved ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}