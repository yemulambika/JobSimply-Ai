import { useEffect, useState } from 'react';

const STEPS = [
  'Analyzing resume structure',
  'Extracting key sections',
  'Comparing with job requirements',
  'Optimizing selected sections',
  'Injecting keywords naturally',
  'Improving bullet points',
  'Rewriting summary',
  'Calculating ATS score',
  'Finalizing tailored resume',
];

export default function GeneratingStep({ jobTitle, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = 4000;
    const stepInterval = totalDuration / STEPS.length;
    const progressIncrement = 100 / STEPS.length;

    const timers = [];
    for (let i = 1; i <= STEPS.length; i++) {
      const timer = setTimeout(() => {
        setCurrentStep(i);
        setProgress(Math.min(100, Math.round(progressIncrement * i)));
      }, stepInterval * i);
      timers.push(timer);
    }

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, totalDuration + 300);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Generating Tailored Resume
          </h2>
          <p className="text-slate-400">
            AI is optimizing your resume for <span className="text-cyan-400 font-medium">{jobTitle || 'this role'}</span>
          </p>
        </div>

        {/* Spinner / Progress */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="#1e293b"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="#22d3ee"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${Math.round(progress / 100 * 327)} 327`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Step-by-step status */}
        <div className="space-y-3">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-slate-800 border-cyan-500'
                    : isCompleted
                      ? 'bg-slate-900 border-slate-700 opacity-70'
                      : 'bg-slate-900 border-slate-800 opacity-40'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`text-sm ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-500 text-center">
          This usually takes a few seconds. Please do not close this page.
        </p>
      </div>
    </div>
  );
}