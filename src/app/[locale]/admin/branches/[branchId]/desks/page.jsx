'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import deskService from '@/services/deskService';
import {
    PencilIcon,
    TrashIcon,
    PlusIcon,
    ChevronUpDownIcon,
    EyeIcon,
    UserGroupIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import debounce from 'lodash/debounce';
import AssignServicesDialog from './AssignServicesDialog';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useTranslations } from 'next-intl';
export default function DesksPage() {
    const router = useRouter();
    const params = useParams();
    const branchId = params.branchId;
    const t = useTranslations('desks');

    const [desks, setDesks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isAssignServicesOpen, setIsAssignServicesOpen] = useState(false);
    const [selectedDesk, setSelectedDesk] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deskToDelete, setDeskToDelete] = useState(null);

    useEffect(() => {
        loadDesks();
    }, [branchId]);

    const loadDesks = async () => {
        try {
            setLoading(true);
            const response = await deskService.getBranchDesks(branchId);

            if (Array.isArray(response)) {
                setDesks(response);
            } else if (response?.success && Array.isArray(response.data)) {
                setDesks(response.data);
            } else {
                console.error('Invalid desk data structure:', response);
                setDesks([]);
                toast.error(t('notifications.failedToLoadDesks'));
            }
        } catch (error) {
            console.error('Error loading desks:', error);
            toast.error(t('notifications.failedToLoadDesks'));
            setDesks([]);
        } finally {
            setLoading(false);
        }
    };

    const initiateDelete = (desk) => {
        setDeskToDelete(desk);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deskToDelete) return;

        try {
            setLoading(true);

            const response = await deskService.deleteDesk(branchId, deskToDelete.id);

            if (response.success) {
                toast.success(t('notifications.deleteSuccess'));
                await loadDesks();
            } else {
                toast.error(response.error || t('notifications.deleteError'));
            }
        } catch (error) {
            console.error('Detailed error in handleDelete:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error(error.message || t('notifications.deleteError'));
        } finally {
            setLoading(false);
            setIsDeleteModalOpen(false);
            setDeskToDelete(null);
        }
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
        setCurrentPage(1);
    }, 300);

    const filteredAndSortedDesks = desks
        .filter(desk => {
            const matchesSearch = (desk.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                desk.manager?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || desk.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortConfig.key === 'employeeCount') {
                const aCount = a.employeeCount || 0;
                const bCount = b.employeeCount || 0;
                return sortConfig.direction === 'asc' ? aCount - bCount : bCount - aCount;
            }

            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            return (
                sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue)
            );
        });

    const totalPages = Math.ceil(filteredAndSortedDesks.length / itemsPerPage);
    const paginatedDesks = filteredAndSortedDesks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const renderServices = (desk) => {
        if (!desk.deskServices || desk.deskServices.length === 0) {
            return <span className="text-gray-400 text-sm">{t('table.noServices')}</span>;
        }

        return (
            <div className="flex flex-wrap gap-1">
                {desk.deskServices.map(ds => (
                    <Badge
                        key={ds.service.id}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                    >
                        {ds.service.name}
                    </Badge>
                ))}
            </div>
        );
    };

    const renderSubServices = (desk) => {
        if (!desk.deskSubServices || desk.deskSubServices.length === 0) {
            return <span className="text-gray-400 text-sm">{t('table.noSubServices')}</span>;
        }

        return (
            <div className="flex flex-wrap gap-1">
                {desk.deskSubServices.map(dss => (
                    <Badge
                        key={dss.subService.id}
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                    >
                        {dss.subService.name}
                    </Badge>
                ))}
            </div>
        );
    };

    const handleAssignServices = (updatedDesk) => {
        if (!updatedDesk || !updatedDesk.id) {
            console.error('Invalid updated desk data:', updatedDesk);
            
            return;
        }

        setDesks(prevDesks =>
            prevDesks.map(desk =>
                desk.id === updatedDesk.id ? updatedDesk : desk
            )
        );
    };

    const columns = [
        {
            accessorKey: "name",
            header: t('table.headers.name'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="text-center">{row.original.name}</span>
                </div>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "services",
            header: t('table.headers.services'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {renderServices(row.original)}
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "subServices",
            header: t('table.headers.subServices'),
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {renderSubServices(row.original)}
                </div>
            ),
            enableSorting: false,
        },
        // {
        //     accessorKey: "manager",
        //     header: "Manager",
        //     cell: ({ row }) => (
        //         <div>
        //             {row.original.manager ? (
        //                 <div>
        //                     <p className="font-medium">{row.original.manager.fullName}</p>
        //                     <p className="text-sm text-gray-500">{row.original.manager.email}</p>
        //                 </div>
        //             ) : (
        //                 <span className="text-gray-400">Not assigned</span>
        //             )}
        //         </div>
        //     ),
        //     enableSorting: true,
        // },
        {
            accessorKey: "status",
            header: t('table.headers.status'),
            cell: ({ row }) => (
                <span
                    className={
                        row.original.status === 'ACTIVE'
                            ? 'border border-activeBtn text-activeBtn px-2 py-1 rounded-2xl'
                            : 'border border-inactiveBtn text-inactiveBtn px-2 py-1 rounded-2xl'
                    }
                >
                    {t(`status.${row.original.status}`)}
                </span>
            ),
            enableSorting: true,
        },
        {
            accessorKey: "employeeCount",
            header: t('table.headers.totalEmployees'),
            cell: ({ row }) => {
                const count = row.original.employeeCount || 0;
                return (
                    <div className="flex items-center text-center justify-center gap-2">
                        <UserGroupIcon className="h-4 w-4 text-primaryGreen" />
                        <span>{count}</span>
                    </div>
                );
            },
            enableSorting: true,
        },
        {
            id: "actions",
            header: t('table.headers.actions'),
            cell: ({ row }) => {
                const desk = row.original;
                return (
                    <div className="flex items-center gap-2 justify-center">
                        {renderActions(desk)}
                    </div>
                );
            },
        },
    ];

    const renderActions = (desk) => {
        return (
            <div className="flex items-center gap-2 justify-center">
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/branches/${branchId}/desks/${desk.id}/edit`)}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                    <div className="tooltip">{t('tooltips.edit')}</div>
                </div>
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/branches/${branchId}/desks/${desk.id}`)}
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Button>
                    <div className="tooltip">{t('tooltips.view')}</div>
                </div>
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => initiateDelete(desk)}
                        className="text-red-600 hover:text-red-900"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                    <div className="tooltip">{t('tooltips.delete')}</div>
                </div>
                <div className="relative group">
                    <Button
                        className="bg-primaryOrange cursor-pointer hover:bg-primaryOrangeHover px-4 py-2 rounded-lg flex items-center gap-1 transition-colors text-white"
                        size="sm"
                        onClick={() => {
                            setSelectedDesk(desk);
                            setIsAssignServicesOpen(true);
                        }}
                    >
                        + {t('addService')}
                    </Button>
                    <div className="tooltip">{t('tooltips.assignServices')}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6  bg-white rounded-lg shadow-sm h-[calc(100vh-100px)]">
           
            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative w-1/2">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primaryGreen" />
                    <input
                        type="text"
                        placeholder={t('table.searchPlaceholder')}
                        className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryGreen"
                        onChange={(e) => debouncedSearch(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border text-primaryGreen border-gray-300 rounded-lg focus:ring-primaryGreen outline-none focus:border-primaryGreen"
                >
                    <option value="all" className='text-primaryGreen'>{t('table.statusFilter.all')}</option>
                    <option value="ACTIVE" className='text-primaryGreen'>{t('table.statusFilter.active')}</option>
                    <option value="INACTIVE" className='text-primaryGreen'>{t('table.statusFilter.inactive')}</option>
                </select>

                <div className="flex w-full">
                    <div className="flex-grow"></div>
                    <Button
                        onClick={() => router.push(`/admin/branches/${branchId}/desks/new`)}
                        className="bg-primaryOrange hover:bg-primaryOrangeHover px-4 py-2 rounded-lg flex items-center gap-1 transition-colors text-white"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        {t('buttons.desk')}
                    </Button>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="bg-white rounded-lg my-8 shadow-md">
                    {
                        paginatedDesks.length === 0 ? (
                            <div className="flex items-center justify-center">
                                <p className="py-8 flex items-center text-center w-full col-span-6 justify-center mx-auto">
                                    {t('table.noDesks')}
                                </p>
                            </div>
                        ) : (
                            <Table className=''>
                                <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead
                                        key={column.accessorKey || column.id}
                                        className={column.enableSorting ? "cursor-pointer text-center" : "text-center"}
                                        onClick={() => column.enableSorting && handleSort(column.accessorKey)}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {column.header}
                                            {column.enableSorting && (
                                                <ChevronUpDownIcon
                                                    className={`h-4 w-4 ${sortConfig.key === column.accessorKey
                                                            ? 'text-gray-900'
                                                            : 'text-gray-400'
                                                        }`}
                                                />
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                          
                            {paginatedDesks.map((desk) => (
                                <TableRow key={desk.id}>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={`${desk.id}-${column.accessorKey || column.id}`}
                                        >
                                            {column.cell({ row: { original: desk } })}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                                </TableBody>
                            </Table>
                        )
                    }
                </div>
            )}

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 sm:px-6 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 border rounded-md"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="ml-2 text-sm text-gray-700">
                            {t('pagination.itemsPerPage')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded-md bg-primaryOrange text-white disabled:opacity-50"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="text-sm text-gray-700">
                            {currentPage} {t('pagination.of')} {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded-md bg-primaryOrange text-white disabled:opacity-50"
                        >
                            <ArrowRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            <AssignServicesDialog
                open={isAssignServicesOpen}
                onClose={() => {
                    setIsAssignServicesOpen(false);
                    setSelectedDesk(null);
                }}
                desk={selectedDesk}
                branchId={branchId}
                onAssign={handleAssignServices}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeskToDelete(null);
                }}
                onConfirm={handleDelete}
                title={t('modal.title')}
                message={t('modal.message', { deskName: deskToDelete?.name })}
                confirmText={t('modal.confirmButton')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}