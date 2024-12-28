'use client'
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';


const ResetPassword = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { forgotPassword, resetPassword } = useAuth();
    const token = searchParams.get('token');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const formData = new FormData(e.target);
        
        if (token) {
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            if (password !== confirmPassword) {
                toast.error('Passwords do not match');
                return;
            }
        }

        setIsLoading(true);
        const loadingToast = toast.loading(
            token ? 'Resetting password...' : 'Sending reset link...'
        );

        try {
            if (token) {
                const password = formData.get('password');
                const result = await resetPassword(token, password);
                
                if (result.success) {
                    toast.dismiss(loadingToast);
                    toast.success('Password reset successful!');
                    router.push('/login');
                } else {
                    throw new Error(result.error || 'Failed to reset password');
                }
            } else {
                const email = formData.get('email');
                const result = await forgotPassword(email);
                
                if (result.success) {
                    toast.dismiss(loadingToast);
                    toast.success('If an account exists, a reset link has been sent to your email.');
                    router.push('/login');
                } else {
                    throw new Error(result.error || 'Failed to send reset link');
                }
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message || 'Operation failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="max-w-md w-full ">
              

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white text-center">
                            {token ? 'Set New Password' : 'Reset Password'}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                            {token
                                ? 'Enter your new password below.'
                                : "Enter your email address and we'll send you a link to reset your password."}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {token ? (
                            <>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="New Password"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500 pr-10"
                                            required
                                            minLength={8}
                                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                            title="Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400"
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            placeholder="Confirm Password"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeSlashIcon className="h-5 w-5" />
                                            ) : (
                                                <EyeIcon className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.
                                </p>
                            </>
                        ) : (
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                required
                            />
                        )}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 text-white bg-primaryGreen hover:bg-primaryGreenHover rounded-lg transition-colors duration-150 disabled:bg-primaryGreenHover disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                    <span>Processing...</span>
                                </div>
                            ) : 
                                token ? 'Reset Password' : 'Send Reset Link'
                            }
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm text-primaryGreen hover:text-primaryGreenHover transition-colors duration-150"
                    >
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;