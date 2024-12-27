'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import branchService from '@/services/branchService';
import deskService from '@/services/deskService';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
export default function AssignServicesDialog({ open, onClose, desk, branchId, onAssign }) {
    const t = useTranslations('assignServices');
    const [loading, setLoading] = useState(false);
    const [branchServices, setBranchServices] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedSubServices, setSelectedSubServices] = useState([]);
    const [activeTab, setActiveTab] = useState('services');

    const loadBranchServices = useCallback(async () => {
        try {
            setLoading(true);
            const response = await branchService.getBranchServices(branchId);
            const formattedServices = response.data?.map(service => ({
                service: {
                    id: service.id,
                    name: service.name,
                    status: service.status,
                    subServices: service.subServices || []
                }
            })) || [];
            setBranchServices(formattedServices);
        } catch (error) {
            console.error('Error loading services:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (open && desk) {
            loadBranchServices();
            setSelectedServices(desk.deskServices?.map(ds => ds.serviceId) || []);
            setSelectedSubServices(desk.deskSubServices?.map(dss => dss.subServiceId) || []);
        }
    }, [open, desk, loadBranchServices]);

    const handleSubmit = async () => {
        try {
            // Validation: Check if services are selected
            if (selectedServices.length === 0) {
                toast.error(t('validation.selectService'));
                return;
            }

            setLoading(true);
           

            // First, assign services
            const servicesResult = await deskService.assignServices(
                branchId, 
                desk.id, 
                selectedServices
            );

            // Only assign sub-services if there are any selected
            if (selectedSubServices.length > 0) {
                const subServicesResult = await deskService.assignSubServices(
                    branchId,
                    desk.id,
                    selectedSubServices
                );
            }

            // Get the final updated desk data
            const updatedDesk = await deskService.getDesk(branchId, desk.id);

            toast.success(t('notifications.success'));
            onAssign(updatedDesk);
            onClose();
        } catch (error) {
            console.error('Detailed error in handleSubmit:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error(error.message || t('notifications.error'));
        } finally {
            setLoading(false);
        }
    };

    // Helper function to check if a service has any sub-services selected
    const hasSelectedSubServices = (serviceId) => {
        const service = branchServices.find(bs => bs.service.id === serviceId);
        return service?.service.subServices?.some(sub => selectedSubServices.includes(sub.id)) || false;
    };

    // Update the service checkbox handler to clear sub-services when unchecking a service
    const handleServiceChange = (serviceId, checked) => {
        if (checked) {
            setSelectedServices([...selectedServices, serviceId]);
        } else {
            setSelectedServices(selectedServices.filter(id => id !== serviceId));
            // Clear sub-services for this service
            const subServicesToRemove = branchServices
                .find(bs => bs.service.id === serviceId)
                ?.service.subServices?.map(sub => sub.id) || [];
            setSelectedSubServices(prev => 
                prev.filter(id => !subServicesToRemove.includes(id))
            );
        }
    };

    const availableSubServices = useMemo(() => {
        return branchServices
            .filter(bs => bs.service && selectedServices.includes(bs.service.id))
            .flatMap(bs => 
                (bs.service.subServices || [])
                    .filter(sub => sub.status === 'ACTIVE')
            );
    }, [branchServices, selectedServices]);

    // Modify the sub-services tab content to group by parent service
    const subServicesTabContent = (
        <div className="max-h-[300px] overflow-y-auto pr-2">
            <div className="space-y-6">
                {selectedServices.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                        {t('subServices.pleaseSelectServices')}
                    </p>
                ) : (
                    branchServices
                        .filter(bs => selectedServices.includes(bs.service.id))
                        .map(bs => (
                            <div key={bs.service.id} className="space-y-2">
                                {/* Parent Service Header */}
                                <div className="font-medium text-gray-700 px-2">
                                    {bs.service.name}
                                </div>
                                
                                {/* Sub-services for this service */}
                                <div className="space-y-2 ml-4">
                                    {bs.service.subServices && bs.service.subServices.length > 0 ? (
                                        bs.service.subServices.map(sub => (
                                            <div key={sub.id} 
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox
                                                        id={`subservice-${sub.id}`}
                                                        checked={selectedSubServices.includes(sub.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedSubServices([...selectedSubServices, sub.id]);
                                                            } else {
                                                                setSelectedSubServices(selectedSubServices.filter(id => id !== sub.id));
                                                            }
                                                        }}
                                                    />
                                                    <Label 
                                                        htmlFor={`subservice-${sub.id}`}
                                                        className="text-sm font-medium cursor-pointer"
                                                    >
                                                        {sub.name}
                                                    </Label>
                                                </div>
                                                <span className={`text-sm px-3 py-1 ${sub.status === 'ACTIVE' ? 'bg-white border border-activeBtn text-activeBtn' : 'bg-white border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}>
                                                    {t(`status.${sub.status}`)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic pl-3">
                                            {t('subServices.noSubServices')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-[600px] bg-white rounded-lg shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">
                            {t('title', { deskName: desk?.name })}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <div>
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger 
                                            value="services"
                                            className="data-[state=active]:bg-white data-[state=active]:border-primaryGreen data-[state=active]:text-primaryGreen border border-gray-300"
                                        >
                                            {t('tabs.services')}
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="subservices"
                                            className="data-[state=active]:bg-white data-[state=active]:border-primaryGreen data-[state=active]:text-primaryGreen border border-gray-300"
                                        >
                                            {t('tabs.subServices')}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="services" className="mt-4">
                                        <div className="max-h-[300px] overflow-y-auto pr-2">
                                            <div className="space-y-4">
                                                {branchServices.map(bs => (
                                                    <div key={bs.service.id} 
                                                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors
                                                            ${selectedServices.includes(bs.service.id) && !hasSelectedSubServices(bs.service.id) 
                                                                ? 'border-l-4 border-yellow-400' 
                                                                : ''}`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <Checkbox
                                                                id={`service-${bs.service.id}`}
                                                                checked={selectedServices.includes(bs.service.id)}
                                                                onCheckedChange={(checked) => handleServiceChange(bs.service.id, checked)}
                                                            />
                                                            <Label 
                                                                htmlFor={`service-${bs.service.id}`}
                                                                className="text-sm font-medium cursor-pointer"
                                                            >
                                                                {bs.service.name}
                                                                {selectedServices.includes(bs.service.id) && !hasSelectedSubServices(bs.service.id) && (
                                                                    <span className="text-yellow-600 text-xs ml-2">
                                                                        {t('services.selectSubServices')}
                                                                    </span>
                                                                )}
                                                            </Label>
                                                        </div>
                                                        <span className={`text-sm px-3 py-1 ${bs.service.status === 'ACTIVE' ? 'bg-white border border-activeBtn text-activeBtn' : 'bg-white border border-inactiveBtn text-inactiveBtn'} rounded-2xl`}>
                                                            {t(`status.${bs.service.status}`)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="subservices" className="mt-4">
                                        {subServicesTabContent}
                                    </TabsContent>
                                </Tabs>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        {t('buttons.cancel')}
                                    </Button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className='bg-primaryOrange px-4 py-2 rounded-lg flex items-center gap-1 transition-colors hover:bg-primaryOrangeHover text-white'
                                    >
                                        {loading ? t('buttons.saving') : t('buttons.save')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}