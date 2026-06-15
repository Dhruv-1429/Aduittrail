import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type, fading: false }]);

        // Start fade out
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, fading: true } : t));
        }, duration - 400);

        // Remove
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const showSuccess = useCallback((msg) => addToast(msg, 'success'), [addToast]);
    const showError = useCallback((msg) => addToast(msg, 'error'), [addToast]);
    const showInfo = useCallback((msg) => addToast(msg, 'info'), [addToast]);

    return (
        <ToastContext.Provider value={{ showSuccess, showError, showInfo }}>
            {children}
            <div className="toast-container" id="toast-container">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`toast toast-${t.type}${t.fading ? ' toast-fade-out' : ''}`}
                    >
                        <span className="toast-icon">
                            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <span className="toast-message">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Fallback if used outside provider
        return {
            showSuccess: (msg) => console.log('SUCCESS:', msg),
            showError: (msg) => console.error('ERROR:', msg),
            showInfo: (msg) => console.info('INFO:', msg),
        };
    }
    return ctx;
}
