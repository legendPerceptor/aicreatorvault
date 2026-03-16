import React from 'react';

function SimilarityRadar({ similarity = 0, size = 60, showLabel = true }) {
  const percentage = Math.max(0, Math.min(1, similarity));
  const radius = size / 2;
  const center = size / 2;
  const strokeWidth = 4;

  // 计算颜色
  const getColor = (sim) => {
    if (sim >= 0.8) return '#10b981'; // 绿色 - 高度匹配
    if (sim >= 0.6) return '#3b82f6'; // 蓝色 - 中等匹配
    if (sim >= 0.4) return '#f59e0b'; // 橙色 - 低匹配
    return '#ef4444'; // 红色 - 很低匹配
  };

  // 计算圆周进度
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  const offset = circumference * (1 - percentage);

  const color = getColor(percentage);
  const level =
    percentage >= 0.8 ? '高' : percentage >= 0.6 ? '中' : percentage >= 0.4 ? '低' : '很低';

  return (
    <div className="similarity-radar">
      <svg width={size} height={size} className="radar-chart">
        {/* 背景圆 */}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />

        {/* 进度圆 */}
        <circle
          cx={center}
          cy={center}
          r={radius - strokeWidth / 2}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="radar-progress"
        />

        {/* 中心文字 */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="radar-text"
        >
          {(percentage * 100).toFixed(0)}%
        </text>
      </svg>

      {showLabel && (
        <div className="similarity-info">
          <span className="similarity-label" style={{ color }}>
            匹配度：{level}
          </span>
        </div>
      )}
    </div>
  );
}

// 简化版本 - 用于搜索结果卡片
export function SimilarityBadge({ similarity, showPercentage = true }) {
  const percentage = Math.max(0, Math.min(1, similarity));
  const getColor = (sim) => {
    if (sim >= 0.8) return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
    if (sim >= 0.6) return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
    if (sim >= 0.4) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
  };

  const colors = getColor(percentage);

  return (
    <div
      className="similarity-badge-compact"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {showPercentage && <span className="percentage">{(percentage * 100).toFixed(0)}%</span>}
      <span className="label">相似度</span>
    </div>
  );
}

// 匹配原因说明组件
export function MatchReason({ reasons = [], maxItems = 3 }) {
  if (!reasons || reasons.length === 0) return null;

  const displayReasons = reasons.slice(0, maxItems);

  return (
    <div className="match-reason">
      <div className="match-reason-header">
        <span className="match-icon">💡</span>
        <span className="match-label">匹配原因：</span>
      </div>
      <div className="match-reasons-list">
        {displayReasons.map((reason, index) => (
          <span key={index} className="match-reason-tag">
            {reason}
          </span>
        ))}
        {reasons.length > maxItems && (
          <span className="match-reason-more">+{reasons.length - maxItems} 更多</span>
        )}
      </div>
    </div>
  );
}

export default SimilarityRadar;
