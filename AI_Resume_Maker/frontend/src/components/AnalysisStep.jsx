import { useState } from 'react';

export default function AnalysisStep({ analysis, resume, job, onNext }) {
  const [expandedCard, setExpandedCard] = useState(null);

  const scores = [
    { key: 'resumeScore', label: 'Resume Score', value: analysis?.resumeScore || 0, color: 'bg-cyan-500' },
    { key: 'jobMatchScore', label: 'Job Match Score', value: analysis?.jobMatchScore || 0, color: 'bg-blue-500' },
    { key: 'atsScore', label: 'ATS Compatibility', value: analysis?.atsScore || 0, color: 'bg-purple-500' },
    { key: 'experienceMatch', label: 'Experience Match', value: analysis?.experienceMatch || 0, color: 'bg-green-500' },
    { key: 'projectMatch', label: 'Project Match', value: analysis?.projectMatch || 0, color: 'bg-yellow-500' },
    { key: 'educationMatch', label: 'Education Match', value: analysis?.educationMatch || 0, color: 'bg-pink-500' },
    { key: 'skillMatch', label: 'Skill Match', value: analysis?.skillMatch || 0, color: 'bg-orange-500' },
    { key: 'keywordMatch', label: 'Keyword Match', value: analysis?.keywordMatch || 0, color: 'bg-indigo-500' },
  ];

  const categories = [
    { key: 'matchedSkills', label: 'Matched Skills', items: analysis?.matchedSkills || [], color: 'green' },
    { key: 'missingSkills', label: 'Missing Skills', items: analysis?.missingSkills || [], color: 'red' },
    { key: 'recommendedSkills', label: 'Recommended Skills', items: analysis?.recommendedSkills || [], color: 'yellow' },
  ];

  const sections = [
    { key: 'weakSections', label: 'Weak Sections', items: analysis?.weakSections || [], color: 'orange' },
    { key: 'missingSections', label: 'Missing Sections', items: analysis?.missingSections || [], color: 'red' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">Resume Analysis</h2>
        <p className="text-slate-400">
          Comprehensive analysis comparing your resume against <span className="text-cyan-400 font-medium">{job?.title}</span> at <span className="text-cyan-400 font-medium">{job?.company}</span>
        </p>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scores.map((score) => (
          <div key={score.key} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-300">{score.label}</span>
              <div className={`w-2 h-2 rounded-full ${score.color}`}></div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{score.value}%</div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${score.color} transition-all duration-1000`}
                style={{ width: `${score.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.key} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className={`text-lg font-semibold mb-4 text-${category.color}-400`}>
              {category.label}
            </h3>
            {category.items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {category.items.map((item, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-${category.color}-500/20 text-${category.color}-300`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No {category.label.toLowerCase()} found</p>
            )}
          </div>
        ))}
      </div>

      {/* Sections Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.key} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className={`text-lg font-semibold mb-4 text-${section.color}-400`}>
              {section.label}
            </h3>
            {section.items.length > 0 ? (
              <ul className="space-y-2">
                {section.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className={`text-${section.color}-400 mt-0.5`}>•</span>
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No {section.label.toLowerCase()} identified</p>
            )}
          </div>
        ))}
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold mb-4">Detailed Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scores.filter(s => s.key !== 'resumeScore' && s.key !== 'jobMatchScore').map((score) => (
            <div
              key={score.key}
              className={`p-4 rounded-lg border border-slate-700 cursor-pointer transition-all ${
                expandedCard === score.key ? 'bg-slate-700' : 'bg-slate-800'
              }`}
              onClick={() => setExpandedCard(expandedCard === score.key ? null : score.key)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-200">{score.label}</span>
                <span className="text-2xl font-bold text-white">{score.value}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${score.color}`}
                  style={{ width: `${score.value}%` }}
                ></div>
              </div>
              {expandedCard === score.key && score.reason && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <p className="text-sm text-slate-400 mb-2">
                    <span className="font-medium text-slate-300">Reason:</span> {score.reason}
                  </p>
                  {score.recommendation && (
                    <p className="text-sm text-cyan-400">
                      <span className="font-medium">Recommendation:</span> {score.recommendation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
        >
          Customize Resume
        </button>
      </div>
    </div>
  );
}