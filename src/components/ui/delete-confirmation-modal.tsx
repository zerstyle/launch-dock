"use client";

import { X, AlertTriangle } from "lucide-react";
import { useEffect, useState, ReactNode } from "react";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    title?: string;
    message: ReactNode;
    onClose: () => void;
    onConfirm: () => void;
    loading?: boolean;
}

export function DeleteConfirmationModal({
    isOpen,
    title = "Delete Confirmation",
    message,
    onClose,
    onConfirm,
    loading = false,
}: DeleteConfirmationModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className={`
                relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden
                transform transition-all duration-300
                ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
            `}>
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="text-red-400" size={20} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="text-white/80 whitespace-pre-wrap">
                        {message}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/5 bg-white/5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                    >
                        {loading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
