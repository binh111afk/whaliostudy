import React, { useState } from 'react';
import { GraduationCap, Calculator, ChevronDown, Award, Target, TrendingUp } from 'lucide-react';
import { SCHOLARSHIP_THRESHOLDS } from '../../services/gpaAdvancedService';

/**
 * ScholarshipToggle - Toggle giữa GPA hiện tại và chế độ học bổng
 */
const ScholarshipToggle = ({ 
  scholarshipInfo,
  selectedLevel,
  onLevelChange,
  isScholarshipMode,
  onModeToggle 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getProbabilityColor = (prob) => {
    if (prob >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (prob >= 50) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    if (prob >= 20) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => onModeToggle(false)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            !isScholarshipMode 
              ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Calculator size={14} />
          GPA
        </button>
        <button
          onClick={() => onModeToggle(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            isScholarshipMode 
              ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <GraduationCap size={14} />
          Học bổng
        </button>
      </div>

      {/* Scholarship Mode Content */}
      {isScholarshipMode && scholarshipInfo && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
          {/* Level Selector */}
          <div 
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <Award size={16} className="text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-bold text-gray-800 dark:text-white">
                {scholarshipInfo.label}
              </span>
              {scholarshipInfo.reward && (
                <span className="text-xs px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                  {scholarshipInfo.reward}
                </span>
              )}
            </div>
            <ChevronDown 
              size={14} 
              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Expanded Level Options */}
          {isExpanded && (
            <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
              {Object.entries(SCHOLARSHIP_THRESHOLDS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    onLevelChange(key);
                    setIsExpanded(false);
                  }}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    selectedLevel === key
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-700'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="font-bold">{value.label}</div>
                  <div className="text-[10px] opacity-70">GPA ≥ {value.gpa}</div>
                </button>
              ))}
            </div>
          )}

          {/* Scholarship Status */}
          {scholarshipInfo.isAchieved ? (
            <div className="text-center py-3">
              <div className="text-2xl mb-1">🎉</div>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                Đã đạt mức {scholarshipInfo.label}!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                GPA {scholarshipInfo.semesterName}: {scholarshipInfo.lastSemesterGpa?.toFixed(2)}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Gap Info */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">GPA cần đạt</p>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-400">
                    {scholarshipInfo.targetGpa}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">GPA hiện tại</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {scholarshipInfo.lastSemesterGpa?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Còn thiếu</p>
                  <p className="text-lg font-black text-red-600 dark:text-red-400">
                    {scholarshipInfo.gap?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Semester Info */}
              <div className="text-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dựa trên GPA học kỳ gần nhất
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-white mt-1">
                  {scholarshipInfo.semesterName}
                </p>
              </div>

              {/* Probability */}
              <div className={`text-center py-2 px-3 rounded-lg ${getProbabilityColor(scholarshipInfo.probability)}`}>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp size={14} />
                  <span className="text-sm font-bold">
                    Khả năng đạt kỳ sau: {scholarshipInfo.probability}%
                  </span>
                </div>
                <p className="text-[10px] mt-1 opacity-80">
                  {scholarshipInfo.gap > 1.0 
                    ? 'Cần cải thiện đáng kể'
                    : scholarshipInfo.gap > 0.5 
                      ? 'Cần nỗ lực nhiều hơn'
                      : scholarshipInfo.gap > 0.2
                        ? 'Cố gắng thêm một chút!'
                        : 'Rất gần với mục tiêu!'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScholarshipToggle;
