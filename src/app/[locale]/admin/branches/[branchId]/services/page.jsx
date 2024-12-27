'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import branchService from '@/services/branchService';
import serviceManagementService from '@/services/serviceManagmentService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useTranslations } from 'next-intl';
export default function BranchServicesPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('services');
    const [branch, setBranch] = useState(null);
    const [services, setServices] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);

            const [branchData, branchServicesResponse, allServicesData] = await Promise.all([
                branchService.getBranch(params.branchId),
                branchService.getBranchServices(params.branchId),
                serviceManagementService.getAllServices()
            ]);

            setBranch(branchData);

            // Extract services from the response
            const branchServices = branchServicesResponse.data?.map(bs => ({
                id: bs.id,
                name: bs.name,
                status: bs.status,
                subServices: bs.subServices || []
            })) || [];

            setServices(branchServices);

            // Filter out services that are already assigned to the branch
            const assignedServiceIds = new Set(branchServices.map(s => s.id));
            const availableServicesList = allServicesData.filter(s =>
                !assignedServiceIds.has(s.id) && s.status === 'ACTIVE'
            );

            setAvailableServices(availableServicesList);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (params.branchId) {
            loadData();
        }
    }, [params.branchId]);

    const handleAddService = async () => {
        if (!selectedService) {
            toast.error(t('validation.selectService'));
            return;
        }

        try {
            setIsAdding(true);
            const serviceId = parseInt(selectedService);
            const branchId = parseInt(params.branchId);
            
            
            // Check if service is already assigned
            const isAlreadyAssigned = services.some(s => s.id === serviceId);
            if (isAlreadyAssigned) {
                toast.error(t('notifications.alreadyAssigned'));
                return;
            }

            const result = await serviceManagementService.assignServiceToBranch(serviceId, branchId);
            
            // Verify the result has the expected data
            if (result && result.id) {
                toast.success(t('notifications.success'));
                await loadData(); // Reload the services list
                setSelectedService(''); // Reset the selection
            } else {
                console.error('Invalid result structure:', result);
                toast.error(t('notifications.error'));
            }
        } catch (error) {
            console.error('Detailed error in handleAddService:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error(error.message || 'Failed to assign service');
        } finally {
            setIsAdding(false);
        }
    };

    const handleRemoveService = async (serviceId,serviceName) => {
        if (!confirm(t('modal.message', { serviceName: serviceName }))) {
            return;
        }

        try {
            setIsRemoving(true);
            const branchId = parseInt(params.branchId);
            
            
            await serviceManagementService.removeServiceFromBranch(serviceId, branchId);
            toast.success(t('notifications.removeSuccess'));
            await loadData();
        } catch (error) {
            console.error('Error removing service:', error);
            toast.error(t('notifications.removeError'));
        } finally {
            setIsRemoving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex-1 space-y-6 bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)] px-4">
         

            {/* Service Selection Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                <div className="flex gap-4">
                   <h3 className='text-xl text-primaryGreen font-bold'>{t('title')}</h3>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('table.headers.name')}</TableHead>
                            <TableHead>{t('table.headers.subServices')}</TableHead>
                            <TableHead>{t('table.headers.status')}</TableHead>
                            <TableHead>{t('table.headers.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                    {t('table.noServices')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            services.map((service) => (
                                <TableRow key={service.id}>
                                    <TableCell>{service.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {service.subServices.map(sub => (
                                                <Badge key={sub.id} variant="secondary">
                                                    {sub.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={service.status === 'ACTIVE' ? 'border border-activeBtn rounded-2xl text-activeBtn px-2 py-1' : 'border border-inactiveBtn rounded-2xl text-inactiveBtn px-2 py-1'}>
                                            {t(`status.${service.status}`)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleRemoveService(service.id,service.name)}
                                            className="border border-red-600 hover:bg-red-700 hover:text-white text-red-600 px-3 py-1 rounded-md transition-colors"
                                        >
                                            {t('buttons.remove')}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}