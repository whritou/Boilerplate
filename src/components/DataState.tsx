'use client';

import React from 'react';
import { motion } from "framer-motion";
import { FileX, ServerCrash } from 'lucide-react';

interface DataStateProps<T> {
    loading: boolean;
    error: unknown | null;
    data: T[];
    loadingMessage?: string;
    errorMessage?: string;
    emptyMessage?: string;
}

const DataState = <T,>({
                           loading,
                           error,
                           data,
                           loadingMessage,
                           errorMessage,
                           emptyMessage,
                       }: DataStateProps<T>) => {

    const displayError = errorMessage
        || (typeof error === 'string' ? error : null)
        || (error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : null)
        || 'An error occured'

    if (loading) {
        return (
            <div className="w-full min-h-[280px] flex flex-col items-center justify-center gap-8">
                <div className="relative flex items-center justify-center">
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute w-24 h-24 rounded-full bg-blue-500/20 blur-2xl"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.15, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                        className="absolute w-16 h-16 rounded-full bg-indigo-400/20 blur-xl"
                    />
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-[3px] border-blue-500/20 border-t-blue-500"
                    />
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-medium text-slate-400 dark:text-slate-500 tracking-wide"
                >
                    {loadingMessage}
                </motion.p>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full min-h-[280px] flex items-center justify-center p-6"
            >
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-0 rounded-2xl bg-red-500/5 blur-2xl" />

                    <div className="relative flex flex-col items-center gap-4 rounded-2xl border border-red-200/60 dark:border-red-950/40 bg-white dark:bg-gray-950 p-8 text-center shadow-xl shadow-red-500/5">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50">
                            <ServerCrash className="w-8 h-8 text-red-500 dark:text-red-400" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                {displayError}
                            </h3>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full min-h-[280px] flex flex-col items-center justify-center gap-4 p-6"
            >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <FileX className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {emptyMessage}
                    </p>
                </div>
            </motion.div>
        );
    }

    return null;
};

export default DataState;