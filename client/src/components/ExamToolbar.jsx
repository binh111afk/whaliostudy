import React from "react";
import {
  Plus,
  FileJson,
  FileType,
  Eye,
  Settings,
  HelpCircle,
} from "lucide-react";

export const ExamToolbar = ({ onAddQuestion, onImportJSON, onImportWord }) => {
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1">
        {/* Add Question */}
        <button
          onClick={onAddQuestion}
          className="w-12 h-12 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all group relative"
          title="Thêm câu hỏi"
        >
          <Plus size={24} />
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Thêm câu hỏi
          </div>
        </button>

        <div className="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>

        {/* Import JSON */}
        <button
          onClick={onImportJSON}
          className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all group relative"
          title="Nhập JSON"
        >
          <FileJson size={22} />
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Nhập JSON
          </div>
        </button>

        {/* Import Word */}
        <button
          onClick={onImportWord}
          className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all group relative"
          title="Nhập Word"
        >
          <FileType size={22} />
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Nhập Word (.docx)
          </div>
        </button>

        <div className="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>

        {/* Preview */}
        <button
          className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all group relative"
          title="Xem trước"
        >
          <Eye size={22} />
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Xem trước
          </div>
        </button>

        {/* Settings */}
        <button
          className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all group relative"
          title="Cài đặt"
        >
          <Settings size={22} />
          <div className="absolute right-full mr-3 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
            Cài đặt
          </div>
        </button>
      </div>

      {/* Help Button */}
      <div className="mt-4 flex justify-center">
        <button
          className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          title="Trợ giúp"
        >
          <HelpCircle size={24} />
        </button>
      </div>
    </div>
  );
};
