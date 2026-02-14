import React from 'react';
import { TrendingUp, TrendingDown, Minus, Target, Map } from 'lucide-react';

/**
 * GpaMapCard - Compact visual summary với progress bar
 */
const GpaMapCard = ({ mapData }) => {
  if (!mapData) return null;

  const { 
    currentGpa4, 
    targetGpa, 
    progress, 
    projectedGpa, 
    trend, 
    nearestMilestone,
    currentMilestone,
    gapToTarget 
  } = mapData;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  const getProgressColor = () => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 90) return 'bg-blue-500';
    if (progress >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Map size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
            GPA Map
          </span>
        </div>
        {/* Mini trend indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-700 rounded-full shadow-sm">
          <TrendIcon size={12} className={trendColor} />
          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
            {projectedGpa?.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="relative mb-3">
        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
          <span>Hiện tại</span>
          {targetGpa > 0 && <span>Mục tiêu: {targetGpa}</span>}
        </div>
        
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
          {/* Progress fill */}
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          
          {/* Target marker */}
          {targetGpa > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-gray-300"
              style={{ left: '100%', transform: 'translateX(-1px)' }}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-lg font-black text-gray-800 dark:text-white">
            {currentGpa4?.toFixed(2)}
          </span>
          {targetGpa > 0 && (
            <span className={`text-xs font-bold ${
              progress >= 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {progress >= 100 ? '✓ Đạt mục tiêu' : `${progress.toFixed(0)}%`}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="flex items-center gap-2 text-[10px]">
        {/* Current milestone */}
        {currentMilestone && (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
            {currentMilestone.label}
          </span>
        )}
        
        {/* Gap to next milestone */}
        {nearestMilestone && gapToTarget > 0 && (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full font-medium flex items-center gap-1">
            <Target size={10} />
            Cần +{gapToTarget.toFixed(2)} → {nearestMilestone.label}
          </span>
        )}

        {/* Trend text */}
        <span className={`ml-auto flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={10} />
          {trend === 'up' ? 'Tăng' : trend === 'down' ? 'Giảm' : 'Ổn định'}
        </span>
      </div>
    </div>
  );
};

export default GpaMapCard;
