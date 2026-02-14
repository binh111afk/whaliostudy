import React from 'react';
import { Sliders, RotateCcw, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

/**
 * SurvivalModePanel - Inline what-if simulation panel
 * Hiển thị bên dưới mỗi course item khi được chọn
 */
const SurvivalModePanel = ({ 
  subject, 
  currentScore, 
  simulatedScore,
  onScoreChange, 
  onReset,
  onClose,
  simulationResult,
  targetGpa 
}) => {
  const minScore = 0;
  const maxScore = 10;
  
  const gpaDelta = simulationResult?.gpaDelta || 0;
  const percentToTarget = simulationResult?.percentToTarget || 0;
  const newGpa = simulationResult?.newGpa4 || 0;

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-t-2 border-blue-200 dark:border-blue-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                Survival Mode
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                - Thử thay đổi điểm {subject?.name || 'môn này'}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={14} className="text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            {/* Slider */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Điểm gốc: <span className="font-bold text-gray-700 dark:text-gray-300">{currentScore ?? '?'}</span>
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Điểm mới: <span className="font-bold text-blue-700 dark:text-blue-300">{simulatedScore?.toFixed(1)}</span>
                </span>
              </div>
              <input
                type="range"
                min={minScore}
                max={maxScore}
                step={0.1}
                value={simulatedScore ?? currentScore ?? 5}
                onChange={(e) => onScoreChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {/* Results */}
            <div className="flex items-center gap-4">
              {/* GPA Change */}
              <div className="text-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-[80px]">
                <div className="flex items-center justify-center gap-1">
                  {gpaDelta > 0 ? (
                    <TrendingUp size={12} className="text-green-500" />
                  ) : gpaDelta < 0 ? (
                    <TrendingDown size={12} className="text-red-500" />
                  ) : (
                    <Minus size={12} className="text-gray-400" />
                  )}
                  <span className={`text-sm font-black ${
                    gpaDelta > 0 ? 'text-green-600 dark:text-green-400' : 
                    gpaDelta < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {gpaDelta > 0 ? '+' : ''}{gpaDelta.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Δ GPA</p>
              </div>

              {/* New GPA */}
              <div className="text-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-[80px]">
                <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                  {newGpa.toFixed(2)}
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">GPA mới</p>
              </div>

              {/* Progress to Target */}
              {targetGpa > 0 && (
                <div className="text-center px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm min-w-[80px]">
                  <span className={`text-sm font-black ${
                    percentToTarget >= 100 ? 'text-green-600 dark:text-green-400' :
                    percentToTarget >= 90 ? 'text-blue-600 dark:text-blue-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {Math.min(percentToTarget, 100).toFixed(0)}%
                  </span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Mục tiêu</p>
                </div>
              )}

              {/* Reset Button */}
              <button
                onClick={onReset}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Đặt lại điểm gốc"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default SurvivalModePanel;
