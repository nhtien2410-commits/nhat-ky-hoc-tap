import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type || 'info'}`}>
          {toast.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
          {toast.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
          {(!toast.type || toast.type === 'info') && <Info size={18} color="#3b82f6" />}

          <span>{toast.message}</span>

          <button 
            className="btn btn-icon" 
            style={{ width: 24, height: 24, marginLeft: '0.5rem', border: 'none', background: 'transparent' }}
            onClick={() => onDismiss(toast.id)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
