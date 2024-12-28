'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/24/outline';
import { getAuthToken } from '@/lib/authService';
import serviceManagementService from '@/services/serviceManagmentService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import debounce from 'lodash/debounce';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';
export default function SubServicesPage() {
    const params = useParams();
    const router = useRouter();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const t = useTranslations('subServices');
    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadService = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                router.push('/login');
                return;
            }

            const data = await serviceManagementService.getService(params.id);
            setService(data);
            setError(null);
        } catch (err) {
            console.error('Error loading service:', err);
            setError(err.message || 'Failed to load service');
            toast.error(err.message || 'Failed to load service');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadService();
    }, [params.id]);

    const handleEdit = () => {
        const token = getAuthToken();
        if (!token) {
            toast.error('Authentication required');
            router.push('/login');
            return;
        }
        // Navigate to the service edit page where sub-services can be managed
        router.push(`/admin/services/${params.id}/edit`);
    };

    // Filtering Logic
    const filteredSubServices = useMemo(() => {
        if (!service?.subServices) return [];
        
        let filtered = [...service.subServices];

        if (searchTerm) {
            filtered = filtered.filter(subService => 
                subService.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(subService => 
                subService.status === statusFilter
            );
        }

        return filtered;
    }, [service?.subServices, searchTerm, statusFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSubServices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedSubServices = filteredSubServices.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    // Debounced search handler
    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    }, 300);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex-1 space-y-6 bg-white rounded-lg h-[calc(100vh-100px)] px-4 py-4 shadow-sm">
            <div className="flex justify-center items-center">
                <h1 className="text-xl text-primaryGreen font-semibold">{t('title', {serviceName: service?.name})}</h1>
            </div>

            {/* Filters Section */}
            <div className="bg-white px-6 py-2 rounded-lg shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative flex items-center gap-2">
                            <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-primaryGreen" />
                            
                            <input
                                type="search"
                                placeholder={t('search.placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 outline-none border-2 px-2 py-1 rounded-md border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                            />
                        </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-max border-2 rounded-md px-2 py-1 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                    >
                        <option value="all">{t('filters.status.all')}</option>
                        <option value="ACTIVE">{t('filters.status.active')}</option>
                        <option value="INACTIVE">{t('filters.status.inactive')}</option>
                    </select>
                    <div className="flex justify-end">
                    <Button 
                    onClick={handleEdit}
                    className="bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                            <PencilIcon className="h-5 w-5" />
                            {t('buttons.edit')}
                        </Button>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="text-sm text-gray-600">
                    {t('summary.showing', {count: paginatedSubServices.length, total: filteredSubServices.length})}
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('table.headers.name')}</TableHead>
                            <TableHead>{t('table.headers.status')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedSubServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-8">
                                    {t('table.noSubServices')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedSubServices.map((subService) => (
                                <TableRow key={subService.id}>
                                    <TableCell>{subService.name}</TableCell>
                                    <TableCell>
                                        <span className={`border ${subService.status === 'ACTIVE' ? 'border-activeBtn text-activeBtn' : 'border-inactiveBtn text-inactiveBtn'} px-2 py-1 rounded-2xl`}>
                                            {t(`status.${subService.status}`)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
                        className="w-20 border border-gray-300 rounded-md outline-none focus:border-primaryGreen px-2 py-1"
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
                        className="bg-primaryOrange hover:bg-primaryOrangeHover disabled:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Button>
                    <span className="text-sm text-gray-600 px-4">
                         {t('pagination.page', {current: currentPage, total: totalPages})}
                    </span>
                    <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-primaryOrange hover:bg-primaryOrangeHover disabled:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <ArrowRightIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}