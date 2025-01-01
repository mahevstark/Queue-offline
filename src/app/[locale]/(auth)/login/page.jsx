'use client'
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from './action';
import { useUser } from '@/context/UserContext';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Login = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser, refreshUser } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const t = useTranslations('login');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const loadingToast = toast.loading(t('form.submit.loading'));

        try {
            const formData = new FormData(e.target);
            const result = await loginUser(formData);
            
            if (!result.success) {
                toast.dismiss(loadingToast);
                toast.error(result.error || t('notifications.error.default'));
                setIsLoading(false);
                return;
            }
            
            // Set user data first
            setUser(result.data);
            await refreshUser(); // Refresh user data to ensure everything is up to date
            
            // Dismiss loading toast
            toast.dismiss(loadingToast);
            toast.success(t('notifications.success'));
            
            // Handle redirect based on role
            let redirectPath;
            switch (result.data.role) {
                case 'SUPERADMIN':
                    redirectPath = '/admin/branches';
                    break;
                case 'MANAGER':
                    redirectPath = '/dashboard';
                    break;
                case 'EMPLOYEE':
                    redirectPath = '/employee-dashboard';
                    break;
                default:
                    redirectPath = '/login';
                    break;
            }
            
            // Use await to ensure the redirect completes
            await router.push(redirectPath);
            
        } catch (err) {
            console.error('Login error:', err);
            toast.dismiss(loadingToast);
            toast.error(t('notifications.error.default'));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-4 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="flex justify-end">
                    <LanguageSwitcher 
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                    />
                </div>

                <h2 className="text-center text-2xl font-semibold text-gray-900 dark:text-white">
                    {t('title')}
                </h2>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    {t('subtitle')}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        name="email"
                        placeholder={t('form.email.placeholder')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        required
                    />
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder={t('form.password.placeholder')}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        >
                            {showPassword ? (
                                <EyeIcon className="h-5 w-5" />
                            ) : (
                                <EyeSlashIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <input
                        type="text"
                        name="license"
                        placeholder={t('form.license.placeholder')}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full px-4 py-2 text-white bg-primaryGreen hover:bg-primaryGreenHover rounded-lg transition-colors duration-150 flex items-center justify-center disabled:bg-primaryGreenHover disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                {t('form.submit.loading')}
                            </>
                        ) : (
                            t('form.submit.default')
                        )}
                    </button>
                </form>
            </div> 
        </div>
    );
};

export default Login;