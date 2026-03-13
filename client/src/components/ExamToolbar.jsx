import React from "react";
import {
  Plus,
  FileJson,
  FileType,
  Eye,
  Settings,
  HelpCircle,
} from "lucide-react";
import Tooltip from "./Tooltip";

export const ExamToolbar = ({ onAddQuestion, onImportJSON, onImportWord }) => {
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 space-y-1">
        {/* Add Question */}
        <Tooltip text="Thêm câu hỏi">
          <button
            onClick={onAddQuestion}
            className="w-12 h-12 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
          >
            <Plus size={24} />
          </button>
        </Tooltip>

        <div className="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>

        {/* Import JSON */}
        <Tooltip text="Nhập JSON">
          <button
            onClick={onImportJSON}
            className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <FileJson size={22} />
          </button>
        </Tooltip>

        {/* Import Word */}
        <Tooltip text="Nhập Word (.docx)">
          <button
            onClick={onImportWord}
            className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <FileType size={22} />
          </button>
        </Tooltip>

        <div className="h-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>

        {/* Preview */}
        <Tooltip text="Xem trước">
          <button
            className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <Eye size={22} />
          </button>
        </Tooltip>

        {/* Settings */}
        <Tooltip text="Cài đặt">
          <button
            className="w-12 h-12 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <Settings size={22} />
          </button>
        </Tooltip>
      </div>

      {/* Help Button */}
      <div className="mt-4 flex justify-center">
        <Tooltip text="Trợ giúp">
          <button
            className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <HelpCircle size={24} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
