'use client';
import { Toaster } from 'react-hot-toast';

const ToastProvider = () => {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#333',
                    color: '#fff',
                },
                success: {
                    style: {
                        background: '#22c55e',
                    },
                },
                error: {
                    style: {
                        background: '#ef4444',
                    },
                },
            }}
        />
    );
};

export default ToastProvider;