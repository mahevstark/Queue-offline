import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

export function UserModal({ isOpen, onClose, onSubmit, user, userRole }) {    
    const t = useTranslations('userModal');
    
    const { register, handleSubmit: formHandleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            fullName: '',
            email: '',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            branchId: '',
            password: ''
        }
    });

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const statusOptions = [
        { value: 'ACTIVE', label: t('options.status.ACTIVE') },
        { value: 'INACTIVE', label: t('options.status.INACTIVE') }
    ];

    useEffect(() => {
        if (user) {
            reset({
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                status: user.status,
                branchId: user.branchId || '',
            });
        } else {
            reset({
                fullName: '',
                email: '',
                role: 'EMPLOYEE',
                status: 'ACTIVE',
                branchId: '',
                password: ''
            });
        }
    }, [user, reset]);

    const getRoleOptions = () => {
        const baseOptions = [
            { value: 'EMPLOYEE', label: t('options.role.EMPLOYEE') }
        ];

        if (userRole !== 'MANAGER') {
            baseOptions.push({ 
                value: 'MANAGER', 
                label: t('options.role.MANAGER') 
            });
        }

        return baseOptions;
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? t('title.edit') : t('title.add')}
            className="max-w-2xl"
        >
            <form onSubmit={formHandleSubmit(handleSubmit)} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('labels.fullName')}
                    </label>
                    <input
                        type="text"
                        {...register('fullName', {
                            required: t('validation.fullName')
                        })}
                        className="w-full outline-none border-2 px-3 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                        placeholder={t('placeholders.fullName')}
                    />
                    {errors.fullName && (
                        <p className="text-red-500 text-sm">{errors.fullName.message}</p>
                    )}
                </div>

                {/* Email */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('labels.email')}
                    </label>
                    <input
                        type="email"
                        {...register('email', {
                            required: t('validation.email.required'),
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: t('validation.email.invalid')
                            }
                        })}
                        className="w-full outline-none border-2 px-3 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                        placeholder={t('placeholders.email')}
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm">{errors.email.message}</p>
                    )}
                </div>

                {/* Password - Modified to show for both new and existing users */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('labels.password')} {user && t('labels.passwordOptional')}
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            {...register('password', {
                                required: !user && t('validation.password.required'),
                                minLength: {
                                    value: 6,
                                    message: t('validation.password.minLength')
                                }
                            })}
                            className="w-full outline-none border-2 px-3 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen pr-10"
                            placeholder={user ? t('placeholders.passwordUpdate') : t('placeholders.password')}
                        />
                        <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            {showPassword ? (
                                <EyeIcon className="h-5 w-5" />
                            ) : (
                                <EyeSlashIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="text-red-500 text-sm">{errors.password.message}</p>
                    )}
                </div>

                {/* Role - Only show for SUPERADMIN */}
                {userRole === 'SUPERADMIN' && (
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                            {t('labels.role')}
                        </label>
                        <select
                            {...register('role')}
                            className="w-full outline-none border-2 px-3 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                        >
                            {getRoleOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Status */}
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                        {t('labels.status')}
                    </label>
                    <select
                        {...register('status')}
                        className="w-full outline-none border-2 px-3 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                    >
                        {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('buttons.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-primaryOrange text-white rounded-lg hover:bg-primaryOrangeHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <>
                                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                {user ? t('buttons.updating') : t('buttons.creating')}
                            </>
                        ) : (
                            user ? t('buttons.update') : t('buttons.create')
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}