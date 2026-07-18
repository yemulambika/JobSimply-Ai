export default function MatchCircle({ score, size = 'md' }) {
  const r = size === 'lg' ? 44 : 28;
  const sw = size === 'lg' ? 7 : 5;
  const dim = (r + sw) * 2;
  const cx = dim / 2;
  const circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * circ;

  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 80 ? 'STRONG MATCH' : score >= 60 ? 'GOOD MATCH' : 'LOW MATCH';

  const textSize = size === 'lg' ? 'text-xl' : 'text-xs';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg
          width={dim}
          height={dim}
          className="-rotate-90"
          viewBox={`0 0 ${dim} ${dim}`}
        >
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={sw}
          />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textSize} font-bold`} style={{ color }}>
            {score ?? '–'}%
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
