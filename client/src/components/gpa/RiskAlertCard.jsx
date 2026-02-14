import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';

/**
 * RiskAlertCard - Compact card hiển thị tối đa 3 cảnh báo quan trọng
 */
const RiskAlertCard = ({ alerts = [], onAlertClick }) => {
  if (!alerts || alerts.length === 0) return null;

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          dot: 'bg-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          dot: 'bg-orange-500',
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-400',
          dot: 'bg-blue-500',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Cảnh báo sớm
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {alerts.map((alert, idx) => {
          const styles = getSeverityStyles(alert.severity);
          return (
            <div
              key={idx}
              onClick={() => onAlertClick?.(alert)}
              className={`flex items-center gap-2 p-2 rounded-lg ${styles.bg} border ${styles.border} cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} shrink-0`} />
              <span className="text-sm">{alert.icon}</span>
              <span className={`text-xs font-medium ${styles.text} flex-1 line-clamp-1`}>
                {alert.message}
              </span>
              <ChevronRight size={12} className="text-gray-400 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskAlertCard;
