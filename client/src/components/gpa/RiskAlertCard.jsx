import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * RiskAlertCard - Compact card hiển thị tối đa 2 cảnh báo quan trọng
 * Chỉ hiển thị khi có cảnh báo và không phải info-only
 */
const RiskAlertCard = ({ alerts = [], onAlertClick }) => {
  // Lọc bỏ alerts loại 'safe' nếu chỉ có 1 alert
  const displayAlerts = alerts.filter(a => 
    a.severity !== 'info' || alerts.length === 1
  );

  if (!displayAlerts || displayAlerts.length === 0) return null;

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          actionBg: 'bg-red-100 dark:bg-red-900/40',
          actionText: 'text-red-800 dark:text-red-300',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          actionBg: 'bg-orange-100 dark:bg-orange-900/40',
          actionText: 'text-orange-800 dark:text-orange-300',
        };
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-400',
          actionBg: 'bg-green-100 dark:bg-green-900/40',
          actionText: 'text-green-800 dark:text-green-300',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-amber-500" />
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Cảnh báo
        </span>
      </div>

      <div className="space-y-2">
        {displayAlerts.map((alert, idx) => {
          const styles = getSeverityStyles(alert.severity);
          return (
            <div
              key={idx}
              onClick={() => onAlertClick?.(alert)}
              className={`p-3 rounded-lg border ${styles.bg} ${styles.border} transition-all`}
            >
              <p className={`text-sm font-medium ${styles.text} leading-tight mb-1.5`}>
                {alert.message}
              </p>
              {alert.action && (
                <div className={`text-xs px-2 py-1 rounded ${styles.actionBg} ${styles.actionText} font-medium inline-block`}>
                  → {alert.action}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskAlertCard;
