'use client';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import branchService from '@/services/branchService';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DeskFormDialog({ open, onClose, onSubmit, initialData, branchId, loading }) {
    const [services, setServices] = useState([]);
    const [subServices, setSubServices] = useState([]);
    const [managers, setManagers] = useState([]);
    const [activeTab, setActiveTab] = useState('basic');
    const t = useTranslations('deskForm');
    const form = useForm({
        defaultValues: {
            name: initialData?.name || '',
            displayName: initialData?.displayName || '',
            description: initialData?.description || '',
            status: initialData?.status || 'ACTIVE',
            serviceIds: initialData?.deskServices?.map(ds => ds.service?.id) || [],
            subServiceIds: initialData?.deskSubServices?.map(dss => dss.subService?.id) || [],
        }
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                displayName: initialData.displayName,
                description: initialData.description,
                status: initialData.status,
                serviceIds: initialData.deskServices?.map(ds => ds.service?.id) || [],
                subServiceIds: initialData.deskSubServices?.map(dss => dss.subService?.id) || [],
            });
        }
    }, [initialData, form]);

    const loadBranchServices = useCallback(async () => {
        try {
            const response = await branchService.getBranchServices(branchId);


            const branchServices = Array.isArray(response.data) ? response.data.map(bs => ({
                id: bs.id,
                name: bs.name,
                status: bs.status,
                subServices: bs.subServices || []
            })) : [];


            setServices(branchServices);
            setSubServices(branchServices.flatMap(bs => bs.subServices));
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error(t('errors.failedToLoadServices'));
        }
    }, [branchId]);

    useEffect(() => {
        if (open) {
            loadBranchServices();
        }
    }, [open, loadBranchServices]);

    // Add a watch for serviceIds to react to service selection changes
    const selectedServiceIds = form.watch("serviceIds") || [];

    // Filter sub-services based on selected services
    const getFilteredSubServices = () => {
        const selectedServices = services.filter(service => 
            selectedServiceIds.includes(service.id.toString())
        );
        return selectedServices.flatMap(service => service.subServices || []);
    };

    // Replace the services tab content with this updated version
    const servicesTabContent = (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">{t('tabs.services')}</h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto p-4 border border-gray-300 rounded-md shadow-sm">
                    {services.map((service) => (
                        <div key={service.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id={`service-${service.id}`}
                                    {...form.register("serviceIds")}
                                    value={service.id}
                                    defaultChecked={initialData?.deskServices?.some(
                                        ds => ds.service?.id === service.id
                                    )}
                                    className="w-4 h-4 rounded border-gray-300 text-primaryGreen focus:ring-primaryGreen"
                                />
                                <label htmlFor={`service-${service.id}`} className="cursor-pointer text-gray-700">
                                    {service.name}
                                </label>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                service.status === 'ACTIVE' 
                                    ? 'bg-primaryGreen-100 text-primaryGreen-800' 
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {service.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {selectedServiceIds.length > 0 && (
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">{t('subServices.title')}</h3>
                    {services
                        .filter(service => selectedServiceIds.includes(service.id.toString()))
                        .map(service => (
                            <div key={service.id} className="mb-6">
                                <h4 className="text-md font-medium text-gray-600 mb-2">
                                    {service.name}
                                </h4>
                                <div className="space-y-3 pl-4">
                                    {service.subServices && service.subServices.length > 0 ? (
                                        service.subServices.map((subService) => (
                                            <div key={subService.id} 
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`subservice-${subService.id}`}
                                                        {...form.register("subServiceIds")}
                                                        value={subService.id}
                                                        defaultChecked={initialData?.deskSubServices?.some(
                                                            dss => dss.subService?.id === subService.id
                                                        )}
                                                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <label htmlFor={`subservice-${subService.id}`} className="cursor-pointer text-gray-700">
                                                        {subService.name}
                                                    </label>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    subService.status === 'ACTIVE' 
                                                        ? 'bg-primaryGreen-100 text-primaryGreen-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {subService.status}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 italic">{t('subServices.noSubServices')}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );

    if (!open) return null;
    if (loading) return <LoadingSpinner />;

    const formContent = (
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 mx-auto">
            <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-semibold text-gray-700">
                    {initialData ? t('title.edit') : t('title.create')}
                </h2>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="flex border-b mb-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('basic')}
                        className={`px-6 py-3 font-medium ${activeTab === 'basic' 
                            ? 'border-b-2 border-primaryGreen text-primaryGreen' 
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('tabs.basic')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('services')}
                        className={`px-6 py-3 font-medium ${activeTab === 'services' 
                            ? 'border-b-2 border-primaryGreen text-primaryGreen' 
                            : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('tabs.services')}
                    </button>
                </div>

                {activeTab === 'basic' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('fields.name.label')} 
                                </label>
                                <input
                                    {...form.register("name", { required: t('fields.name.error') })}
                                    className={`w-full px-4 py-2 border rounded-md shadow-sm outline-none focus:ring-primaryGreen focus:border-primaryGreen ${
                                        form.formState.errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder={t('fields.name.placeholder')}
                                />
                                {form.formState.errors.name && (
                                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
                                )}
                            </div>
{/* 
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Name *
                                </label>
                                <input
                                    {...form.register("displayName", { required: 'Display name is required' })}
                                    className={`w-full px-4 py-2 border rounded-md shadow-sm outline-none focus:ring-primaryGreen focus:border-primaryGreen ${
                                        form.formState.errors.displayName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter display name"
                                />
                                {form.formState.errors.displayName && (
                                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.displayName.message}</p>
                                )}
                            </div> */}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('fields.description.label')}
                                </label>
                                <textarea
                                    {...form.register("description")}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-primaryGreen focus:border-primaryGreen"
                                        placeholder={t('fields.description.placeholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    {...form.register("status")}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm outline-none focus:ring-primaryGreen focus:border-primaryGreen"
                                >
                                    <option value="ACTIVE">{t('fields.status.options.active')}</option>
                                    <option value="INACTIVE">{t('fields.status.options.inactive')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'services' && (
                    servicesTabContent
                )}

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        {t('buttons.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-4 py-2 bg-primaryOrange text-white rounded-lg hover:bg-primaryOrangeHover transition-colors disabled:bg-primaryOrange-300 ${
                            loading ? 'cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? t('buttons.creating') : (initialData ? t('buttons.update') : t('buttons.create'))}
                    </button>
                </div>
            </form>
        </div>
    );
   
        return formContent;

}