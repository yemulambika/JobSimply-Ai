import { useState, useEffect } from 'react';

const DEFAULT_SECTIONS = [
  { id: 'summary', label: 'Professional Summary' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'languages', label: 'Languages' },
  { id: 'softSkills', label: 'Soft Skills' },
];

const KEYWORD_CATEGORIES = [
  {
    key: 'programmingLanguages',
    label: 'Programming Languages',
    items: [],
  },
  {
    key: 'frameworks',
    label: 'Frameworks',
    items: [],
  },
  {
    key: 'libraries',
    label: 'Libraries',
    items: [],
  },
  {
    key: 'cloud',
    label: 'Cloud',
    items: [],
  },
  {
    key: 'databases',
    label: 'Databases',
    items: [],
  },
  {
    key: 'devOps',
    label: 'DevOps',
    items: [],
  },
  {
    key: 'softSkills',
    label: 'Soft Skills',
    items: [],
  },
  {
    key: 'methodologies',
    label: 'Methodologies',
    items: [],
  },
  {
    key: 'tools',
    label: 'Tools',
    items: [],
  },
];

export default function CustomizeStep({
  analysis = {},
  resume = {},
  job = {},
  onNext,
  onBack,
}) {
  const [selectedSections, setSelectedSections] = useState(
    DEFAULT_SECTIONS.map((s) => s.id)
  );
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [keywordCategories, setKeywordCategories] = useState(KEYWORD_CATEGORIES);
  const [length, setLength] = useState('standard');
  const [tone, setTone] = useState('professional');
  const [optimizationLevel, setOptimizationLevel] = useState('balanced');

  useEffect(() => {
    if (analysis?.keywordCategories && analysis.keywordCategories.length > 0) {
      setKeywordCategories(
        analysis.keywordCategories.map((category) => ({
          key: category.key,
          label: category.label,
          items: Array.isArray(category.items) ? category.items : [],
        }))
      );
    }
  }, [analysis]);

  const toggleSection = (id) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleKeyword = (keyword) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]
    );
  };

  const addCustomKeyword = () => {
    const trimmed = customKeyword.trim();
    if (!trimmed) return;
    if (selectedKeywords.includes(trimmed)) {
      setCustomKeyword('');
      return;
    }
    setSelectedKeywords((prev) => [...prev, trimmed]);
    setCustomKeyword('');
  };

  const estimatedAts = estimateAts();

  function estimateAts() {
    const base = Math.min(analysis?.atsScore ?? 0, 100);
    const keywordBoost = Math.min(selectedKeywords.length * 1.5, 15);
    const sectionBoost = selectedSections.length * 1.2;
    const levelBoost =
      optimizationLevel === 'conservative'
        ? 0
        : optimizationLevel === 'aggressive'
          ? 8
          : 4;
    const score = Math.min(100, Math.round(base + keywordBoost + sectionBoost + levelBoost));
    return score;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">Customize Resume</h2>
        <p>
          Choose what AI should improve for <span className="text-cyan-400 font-medium">{job?.title}</span> and select keywords to
          inject naturally into your resume.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Sections */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Choose Sections to Improve</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEFAULT_SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer hover:border-slate-600 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSections.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                  className="w-4 h-4 rounded border-slate-600"
                />
                <span className="text-sm text-slate-200">{section.label}</span>
              </label>
            ))}
          </div>

          {/* Options */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="brief">Brief</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Optimization</label>
              <select
                value={optimizationLevel}
                onChange={(e) => setOptimizationLevel(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT: Keywords */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold mb-4">Missing Skills</h3>
          <p className="text-sm text-slate-400 mb-4">
            Select keywords to inject naturally into your resume.
          </p>

          {/* Custom keyword input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="Add custom keyword..."
              className="flex-1 p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomKeyword();
                }
              }}
            />
            <button
              onClick={addCustomKeyword}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {keywordCategories.map((category) => (
              <div key={category.key}>
                <h4 className="text-sm font-semibold text-slate-300 mb-2">{category.label}</h4>
                {category.items.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {category.items.map((keyword) => {
                      const isSelected = selectedKeywords.includes(keyword);
                      return (
                        <button
                          key={keyword}
                          onClick={() => toggleKeyword(keyword)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isSelected
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {keyword}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No items in this category</p>
                )}
              </div>
            ))}
          </div>

          {/* Selected keywords summary */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Selected Keywords</span>
              <span className="text-sm text-slate-400">{selectedKeywords.length} selected</span>
            </div>
            {selectedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1.5 rounded-lg text-sm bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No keywords selected yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Estimated ATS */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold mb-4">Estimated Improvement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Current ATS</div>
            <div className="text-3xl font-bold text-white">{analysis?.atsScore ?? 0}%</div>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-slate-400"
                style={{ width: `${Math.min(analysis?.atsScore ?? 0, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 border border-cyan-700">
            <div className="text-sm text-cyan-300 mb-1">Estimated ATS</div>
            <div className="text-3xl font-bold text-cyan-400">{estimatedAts}%</div>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-cyan-500"
                style={{ width: `${estimatedAts}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 border border-green-700">
            <div className="text-sm text-green-300 mb-1">Potential Improvement</div>
            <div className="text-3xl font-bold text-green-400">
              +{Math.max(estimatedAts - (analysis?.atsScore ?? 0), 0)}%
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Based on {selectedSections.length} sections and {selectedKeywords.length} keywords
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={() =>
            onNext({
              selectedSections,
              selectedKeywords,
              tone,
              length,
              optimizationLevel,
              estimatedAts,
            })
          }
          disabled={selectedSections.length === 0}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          Generate Tailored Resume
        </button>
      </div>
    </div>
  );
}