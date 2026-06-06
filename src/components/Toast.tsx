/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void; key?: React.Key }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle2 className="h-4.5 w-4.5 text-neutral-900" />,
    info: <Info className="h-4.5 w-4.5 text-neutral-600" />,
    error: <AlertCircle className="h-4.5 w-4.5 text-red-600" />,
  };

  const bgClasses = {
    success: 'bg-white border-neutral-200 text-neutral-900 shadow-lg',
    info: 'bg-white border-neutral-100 text-neutral-800 shadow-md',
    error: 'bg-white border-red-100 text-neutral-900 shadow-md',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl border p-4 ${bgClasses[toast.type]}`}
      id={`toast-${toast.id}`}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="text-xs font-medium leading-relaxed flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="text-neutral-400 hover:text-neutral-600 rounded-full p-1"
      >
        &times;
      </button>
    </motion.div>
  );
}
