'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { registerUser } from './action';

const Register = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const formData = new FormData(e.target);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Creating your account...');

        try {
            const result = await registerUser(formData);
            
            toast.dismiss(loadingToast);
            
            if (result.success) {
                toast.success('Registration successful!');
                router.push('/login?registered=true');
            } else {
                toast.error(result.error || 'Registration failed');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="max-w-md w-full space-y-8">
                {/* Logo or Brand
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-green-600 dark:text-green-500">
                        Növbe Soft
                    </h1>
                </div> */}

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white text-center">
                            Create an Account
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
                            Join us to start managing your queue system
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <input
                                type="text"
                                name="name"
                                placeholder="Full Name"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email Address"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Password"
                                required
                                minLength={8}
                                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                title="Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500 pr-10"
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

                        {/* Confirm Password */}
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                required
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-500 focus:ring-1 focus:ring-green-500 pr-10"
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

                        {/* Password Requirements */}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.
                        </p>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-2 text-white bg-primaryGreen hover:bg-primaryGreenHover rounded-lg transition-colors duration-150 disabled:bg-primaryGreenHover disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>
                </div>

                {/* Login Link */}
                <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="text-primaryGreen hover:text-primaryGreenHover font-medium"
                        >
                            Login here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;