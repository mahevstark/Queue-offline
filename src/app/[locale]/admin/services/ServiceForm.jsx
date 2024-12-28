'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import serviceManagementService from '@/services/serviceManagmentService';
import branchService from '@/services/branchService';
import { Button } from "@/components/ui/button";
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

export default function ServiceForm({ serviceId }) {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        status: 'ACTIVE',
        branchIds: [],
        subServices: []
    });
    const [branches, setBranches] = useState([]);
    const [errors, setErrors] = useState({});
    const t = useTranslations('serviceForm');

    useEffect(() => {
        loadBranches();
        if (serviceId) {
            loadService();
        }
    }, [serviceId]);

    const loadBranches = async () => {
        try {
            const response = await branchService.getAllBranches();
            let branchesData = response.data || response;
            
            if (!Array.isArray(branchesData)) {
                console.error('Invalid branches data:', branchesData);
                toast.error(t('notifications.invalidBranchesData'));
                setBranches([]);
                return;
            }

            if (user?.role === 'MANAGER') {
                branchesData = branchesData.filter(branch => branch.managerId === user.id);
                
                if (branchesData.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        branchIds: [branchesData[0].id]
                    }));
                }
            }

            setBranches(branchesData);
        } catch (error) {
            console.error('Failed to load branches:', error);
            toast.error(t('notifications.branchLoadError'));
            setBranches([]);
        }
    };

    const loadService = async () => {
        try {
            setLoading(true);
            const service = await serviceManagementService.getService(serviceId);
            
            if (!service) {
                toast.error(t('notifications.serviceNotFound'));
                router.push('/admin/services');
                return;
            }

            let branchIds = service.branches?.map(b => b.branch.id) || [];
            if (user?.role === 'MANAGER') {
                branchIds = branchIds.filter(id => 
                    branches.some(branch => branch.id === id && branch.managerId === user.id)
                );
            }

            setFormData({
                name: service.name,
                status: service.status || 'ACTIVE',
                branchIds: branchIds,
                subServices: service.subServices || []
            });
        } catch (error) {
            toast.error(error.message || t('notifications.loadError'));
            router.push('/admin/services');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.name?.trim()) {
            errors.name = t('sections.basic.name.required');
        }

        if (formData.branchIds.length === 0) {
            errors.branches = t('sections.branches.error');
        }

        formData.subServices.forEach((sub, index) => {
            if (!sub.name?.trim()) {
                errors[`subService${index}`] = t('sections.subServices.required');
            }
        });

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error(t('notifications.validation'));
            return;
        }

        try {
            setLoading(true);
            const loadingToast = toast.loading(
                serviceId ? t('buttons.updating') : t('buttons.creating')
            );

            const serviceData = {
                name: formData.name.trim(),
                status: formData.status,
                branchIds: formData.branchIds,
                subServices: formData.subServices.map(sub => ({
                    ...(sub.id && { id: sub.id }),
                    name: sub.name.trim(),
                    status: sub.status || 'ACTIVE'
                }))
            };

            if (serviceId) {
                await serviceManagementService.updateService(serviceId, serviceData);
                toast.success(t('notifications.updateSuccess'));
            } else {
                await serviceManagementService.createService(serviceData);
                toast.success(t('notifications.createSuccess'));
            }
            
            toast.dismiss(loadingToast);
            router.push('/admin/services');
        } catch (error) {
            toast.error(error.message || t('notifications.updateError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Main Content Card */}
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
                        {/* Service Name Section */}
                        <div className="p-8 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('sections.basic.title')}</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('sections.basic.name.label')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className={`w-full outline-none px-4 py-3 rounded-lg border ${
                                            errors.name 
                                                ? 'border-red-500 focus:ring-red-500' 
                                                : 'border-gray-300 focus:ring-green-500'
                                        } focus:ring-2 focus:ring-offset-2 transition-all duration-200`}
                                        placeholder={t('sections.basic.name.placeholder')}
                                    />
                                    {errors.name && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center">
                                            <span className="mr-1">⚠️</span> {errors.name}
                                        </p>
                                    )}
                                </div>

                                {/* Status Section */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        {t('sections.basic.status.label')}
                                    </label>
                                    <div className="flex gap-4">
                                        {[{value: 'ACTIVE', label: t('sections.basic.status.active')}, {value: 'INACTIVE', label: t('sections.basic.status.inactive')}].map(status => (
                                            <label key={status.value} className="relative flex-1 max-w-[200px]">
                                                <input
                                                    type="radio"
                                                    value={status.value}
                                                    checked={formData.status === status.value}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-full text-center px-6 py-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                                    peer-checked:border-primaryGreen peer-checked:bg-primaryGreen-50
                                                    hover:border-primaryGreen-200 hover:bg-gray-50">
                                                    <span className={`font-medium ${formData.status === status.value ? 'text-primaryGreen' : 'text-gray-600'}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branches Section */}
                        <div className="p-8 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('sections.branches.title')}</h2>
                            {branches.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {branches.map((branch) => (
                                        <label key={branch.id} className="relative">
                                            <input
                                                type="checkbox"
                                                checked={formData.branchIds.includes(branch.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (user?.role === 'MANAGER' && branch.managerId !== user.id) {
                                                        return;
                                                    }
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        branchIds: checked
                                                            ? [...prev.branchIds, branch.id]
                                                            : prev.branchIds.filter(id => id !== branch.id)
                                                    }));
                                                }}
                                                disabled={user?.role === 'MANAGER' && branch.managerId !== user.id}
                                                className="peer sr-only"
                                            />
                                            <div className={`h-full px-4 py-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                                                ${user?.role === 'MANAGER' && branch.managerId !== user.id 
                                                    ? 'opacity-50 cursor-not-allowed' 
                                                    : 'peer-checked:border-primaryGreen peer-checked:bg-primaryGreen-50 hover:border-primaryGreen-200 hover:bg-white'
                                                }`}>
                                                <span className={`block text-center font-medium ${
                                                    formData.branchIds.includes(branch.id) ? 'text-primaryGreen' : 'text-gray-600'
                                                }`}>
                                                    {branch.name}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500">
                                    {t('sections.branches.noBranches')}
                                </div>
                            )}
                            {errors.branches && (
                                <p className="mt-2 text-sm text-red-600 flex items-center">
                                    <span className="mr-1">⚠️</span> {errors.branches}
                                </p>
                            )}
                        </div>

                        {/* Sub-Services Section */}
                        <div className="p-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('sections.subServices.title')}</h2>
                            <div className="space-y-4">
                                {formData.subServices.map((subService, index) => (
                                    <div key={index} className="flex gap-3 items-center bg-gray-50 p-4 rounded-lg">
                                        <input
                                            type="text"
                                            value={subService.name}
                                            onChange={(e) => {
                                                const newSubServices = [...formData.subServices];
                                                newSubServices[index] = {
                                                    ...newSubServices[index],
                                                    name: e.target.value
                                                };
                                                setFormData(prev => ({ ...prev, subServices: newSubServices }));
                                            }}
                                            className={`flex-1 px-4 py-3 rounded-lg border outline-none ${
                                                errors[`subService${index}`]
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:ring-primaryGreen'
                                            } focus:ring-2 focus:ring-offset-2 transition-all duration-200`}
                                            placeholder={t('sections.subServices.placeholder')}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                const newSubServices = formData.subServices.filter((_, i) => i !== index);
                                                setFormData(prev => ({ ...prev, subServices: newSubServices }));
                                            }}
                                            variant="outline"
                                            size="icon"
                                            className="flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-full bg-white border-2 border-red-200
                                                text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            subServices: [...prev.subServices, { name: '', status: 'ACTIVE' }]
                                        }));
                                    }}
                                    variant="outline"
                                    className="w-full py-4 border-2 border-dashed rounded-lg
                                        border-gray-300 hover:border-primaryGreen bg-white hover:bg-primaryGreen-50
                                        text-gray-600 hover:text-primaryGreen transition-all duration-200"
                                >
                                    <PlusIcon className="h-5 w-5 mr-2 inline-block" />
                                    {t('sections.subServices.add')}
                                </Button>
                            </div>
                        </div>
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 my-4 mr-4">
                        <Button
                            type="button"
                            onClick={() => router.push('/admin/services')}
                            variant="outline"
                            className="px-6 py-3 text-base font-medium border-2 border-gray-300 
                                text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
                        >
                                    {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-3 text-base font-medium bg-primaryOrange text-white 
                                rounded-lg hover:bg-primaryOrangeHover transition-all duration-200 
                                shadow-lg hover:shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span className="flex justify-center items-center">
                                   <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
                                    {serviceId ? t('buttons.updating') : t('buttons.creating')}
                                </span>
                            ) : (
                                    serviceId ? t('buttons.update') : t('buttons.create')
                            )}
                        </Button>
                    </div>
                    </div>

                </form>
            </div>
        </div>
    );
}