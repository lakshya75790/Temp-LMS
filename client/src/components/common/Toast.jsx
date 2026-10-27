import React from 'react';
import ReactDOM from 'react-dom';
import { useNotification } from '../../context/NotificationContext';
import { formatDisplayText } from '../../utils/formatters';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useNotification();

  if (!toasts.length) return null;

  return ReactDOM.createPortal(
    <div className="fixed bottom-5 right-5 z-[100000] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start p-4 rounded-2xl shadow-2xl border transition-all duration-300 transform translate-y-0 animate-fade-in bg-white dark:bg-slate-900 ${
              isSuccess ? 'border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300' :
              isError ? 'border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300' :
              'border-indigo-200 dark:border-indigo-800/60 text-indigo-800 dark:text-indigo-300'
            }`}
          >
            <div className="mr-3 mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            </div>
            <div className="flex-1 text-xs sm:text-sm">
              {toast.title && <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">{formatDisplayText(toast.title)}</h4>}
              <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{formatDisplayText(toast.message)}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

