'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import serviceManagementService from '@/services/serviceManagmentService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, PlusIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import debounce from 'lodash/debounce';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

export default function ServicesPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const t = useTranslations('adminServices');

    // State Management
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Add this state for delete confirmation
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        serviceId: null,
        serviceName: ''
    });

    // Add this to control UI elements based on role
    const canCreateService = user?.role === 'SUPERADMIN' || user?.role === 'MANAGER';
    const canEditService = (service) => {
        if (user?.role === 'SUPERADMIN') return true;
        if (user?.role === 'MANAGER') {
            // Check if service is associated with manager's branch
            return service.branches.some(b => b.branch.managerId === user.id);
        }
        return false;
    };

    // Load services
    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const data = await serviceManagementService.getAllServices();
            setServices(Array.isArray(data) ? data : []);
            setError(null);
        } catch (error) {
            console.error('Error loading services:', error);
            setError(error.message || 'Failed to load services');
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        if (!authLoading && user) {
            loadServices();
        }
    }, [authLoading, user, loadServices]);

    // Debounced search handler
    const debouncedSearch = useMemo(
        () => debounce((value) => {
            setSearchTerm(value);
            setCurrentPage(1);
        }, 300),
        []
    );

    // Filtering and Sorting Logic
    const filteredAndSortedServices = useMemo(() => {
        let filtered = [...services];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(service => 
                service.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(service => 
                service.status === statusFilter
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (!aValue) return 1;
            if (!bValue) return -1;

            if (aValue.toLowerCase() < bValue.toLowerCase()) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue.toLowerCase() > bValue.toLowerCase()) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [services, searchTerm, statusFilter, sortConfig]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredAndSortedServices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedServices = filteredAndSortedServices.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    // Event Handlers
    const handleNewServiceClick = () => {
        router.push('/admin/services/new');
    };

    const handleEditClick = (serviceId) => {
        router.push(`/admin/services/${serviceId}/edit`);
    };

    const handleSubServicesClick = (serviceId) => {
        router.push(`/admin/services/${serviceId}/subservices`);
    };

    // Update the handleDelete function
    const handleDelete = (service) => {
        setDeleteModal({
            isOpen: true,
            serviceId: service.id,
            serviceName: service.name
        });
    };

    // Add this new function to handle the actual deletion
    const confirmDelete = async () => {
        try {
            setLoading(true);
            await serviceManagementService.deleteService(deleteModal.serviceId);
            toast.success(t('notifications.deleteSuccess'));
            loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            toast.error(t('notifications.deleteError'));
        } finally {
            setLoading(false);
            setDeleteModal({ isOpen: false, serviceId: null, serviceName: '' });
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-center text-lg ">{error}</div>;

    return (
        <div className="flex-1  bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)] px-4">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg  text-gray-500 font-medium">{t('title')}</h3>
            </div>
            {/* Filters Section */}
            <div className="bg-white px-6 py-2 rounded-lg shadow-sm space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative flex items-center gap-2">
                            <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-primaryGreen" />
                            
                            <input
                                type="search"
                                placeholder={t('search.placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 outline-none border-2 px-2 py-2 rounded-md border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                            />
                        </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full border-2 rounded-md px-2 py-1 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                    >
                        <option value="all">{t('filters.status.all')}</option>
                        <option value="ACTIVE">{t('filters.status.active')}</option>
                        <option value="INACTIVE">{t('filters.status.inactive')}</option>
                    </select>
                    {canCreateService && (
                        <div className="flex justify-end">
                        <Button 
                        onClick={handleNewServiceClick}
                        className="bg-primaryOrange w-max hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                            <PlusIcon className="h-5 w-5" />
                            {t('buttons.new')}
                        </Button>
                    </div>
                    )}
                </div>

                {/* Results Summary */}
                <div className="text-sm text-gray-600">
                    {t('summary.showing', { count: paginatedServices.length, total: filteredAndSortedServices.length })}
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {services.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('table.noServices')}</p>
                    </div>
                ) : (
                    <div className="rounded-md bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-start">{t('table.headers.name')}</TableHead>
                                    <TableHead>{t('table.headers.subServices')}</TableHead>
                                    <TableHead>{t('table.headers.branches')}</TableHead>
                                    <TableHead>{t('table.headers.status')}</TableHead>
                                    <TableHead>{t('table.headers.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedServices.map((service) => (
                                    <TableRow key={service.id}>
                                        <TableCell className="text-start">{service.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {service.subServices?.length || 0} {t('table.headers.subServices')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {service.branches?.length || 0} {t('table.headers.branches')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`${service.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'} px-2 py-1 rounded-2xl`}>
                                                {t(`status.${service.status}`)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 justify-center">
                                                {canEditService(service) && (
                                                    <Button 
                                                        className="border border-primaryGreen hover:bg-primaryGreenHover text-primaryGreen px-4 py-2 rounded-lg flex items-center gap-2 hover:text-white transition-colors"
                                                        onClick={() => handleEditClick(service.id)}
                                                    >
                                                        <PencilIcon className="h-4 w-4" /> {t('buttons.edit')}
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleSubServicesClick(service.id)}
                                                >
                                                    <ListBulletIcon className="h-4 w-4 " /> {t('buttons.subServices')}
                                                </Button>
                                                <Button
                                                    className="border border-red-500 hover:bg-red-600 text-red-500 px-4 py-2 rounded-lg flex items-center gap-1 hover:text-white transition-colors"
                                                    size="sm"
                                                    onClick={() => handleDelete(service)}
                                                >
                                                    <TrashIcon className="h-4 w-4" /> {t('buttons.delete')}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Pagination Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="w-20 border border-gray-300 rounded-md focus:border-green-500 focus:ring-green-500 px-2 py-1"
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                    <span className="text-sm text-gray-600">{t('pagination.itemsPerPage')}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                    <span className="text-sm text-gray-600 px-4">
                        {t('pagination.page', { current: currentPage, total: totalPages })}
                    </span>
                    <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, serviceId: null, serviceName: '' })}
                onConfirm={confirmDelete}
                title={t('modal.title')}
                message={t('modal.message', { serviceName: deleteModal.serviceName })}
                confirmText={t('modal.confirmButton')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}