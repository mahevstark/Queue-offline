'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import branchService from '@/services/branchService';
import { useAuth } from '@/hooks/useAuth';
import {
    PencilIcon,
    TrashIcon,
    PlusIcon,
    UserGroupIcon,
    ComputerDesktopIcon,
    WrenchScrewdriverIcon,
    ChevronUpDownIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import debounce from 'lodash/debounce';
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useTranslations } from 'next-intl';

export default function BranchesPage() {
    const router = useRouter();
    const t = useTranslations('branches');
    const { user, isLoading: userLoading } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        branchId: null,
        branchName: ''
    });

    useEffect(() => {
        if (!userLoading && user) {
            loadBranches();
        }
    }, [user, userLoading]);

    const loadBranches = async () => {
        try {
            setLoading(true);

            if (user) {

                const response = await branchService.getAllBranches();

                // Extract the branches array from the response
                const allBranches = response.data || [];

                let data = [];
                if (user.role === 'SUPERADMIN') {
                    data = allBranches;
                } else if (user.role === 'MANAGER') {
                    // Filter branches where this user is the manager
                    data = allBranches.filter(branch =>
                        branch.managerId === user.id ||
                        branch.manager?.id === user.id
                    );
                }

                setBranches(data);
            } else {
                router.push('/login');
                return;
            }
        } catch (error) {
            console.error('Detailed error loading branches:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (branch) => {
        setDeleteModal({
            isOpen: true,
            branchId: branch.id,
            branchName: branch.name
        });
    };

    const confirmDelete = async () => {
        try {
            await branchService.deleteBranch(deleteModal.branchId);
            toast.success(t('notifications.deleteSuccess'));
            loadBranches();
        } catch (error) {
            toast.error(t('notifications.deleteError'));
        } finally {
            setDeleteModal({ isOpen: false, branchId: null, branchName: '' });
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

    const filteredAndSortedBranches = branches
        .filter(branch => {
            const matchesSearch = (branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                branch.address?.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) aValue = '';
            if (bValue === null || bValue === undefined) bValue = '';

            // Convert to strings for comparison
            aValue = String(aValue);
            bValue = String(bValue);

            // Perform the comparison
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });

    const totalPages = Math.ceil(filteredAndSortedBranches.length / itemsPerPage);
    const paginatedBranches = filteredAndSortedBranches.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (userLoading || loading) {
        return <LoadingSpinner />;
    }

    if (!user || !['SUPERADMIN', 'MANAGER'].includes(user.role)) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">{t('unauthorized')}</p>
            </div>
        );
    }

    const renderHeader = () => {
        if (user?.role === 'SUPERADMIN') {
            return (
                <div className="flex justify-between items-center">
                     {/* Header Section */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg  text-gray-500 font-medium">{t('pageTitle.superadmin')}</h3>
            </div>
                    <Button
                        onClick={() => router.push('/admin/branches/new')}
                        className="bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" />
                        {t('actions.addBranch')}
                    </Button>
                </div>
            );
        }
        return null;
    };

    const renderActions = (branch) => {
        if (!user) return null;

        const commonActions = [
            <div className="relative group" key="series">
                <Button
                    onClick={() => router.push(`/admin/branches/${branch.id}/token-series`)}
                    className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-md"
                >
                    <PlusIcon className="h-5 w-5 mr-1" />
                    {t('actions.tokenSeries')}
                </Button>
                <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('actions.viewTokenSeries')}
                </div>
            </div>,
            <div className="relative group" key="employees">
                <Button
                    onClick={() => router.push(`/admin/branches/${branch.id}/employees`)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <UserGroupIcon className="h-4 w-4" />
                </Button>
                <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                   {t('actions.viewEmployees')}
                </div>
            </div>,
            <div className="relative group" key="desks">
                <Button
                    onClick={() => router.push(`/admin/branches/${branch.id}/desks`)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ComputerDesktopIcon className="h-4 w-4" />
                </Button>
                <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('actions.viewDesks')}
                </div>
            </div>,
            <div className="relative group" key="services">
                <Button
                    onClick={() => router.push(`/admin/branches/${branch.id}/services`)}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <WrenchScrewdriverIcon className="h-4 w-4" />
                </Button>
                <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('actions.viewServices')}
                </div>
            </div>
        ];

        if (user.role === 'SUPERADMIN') {
            return [
                ...commonActions,
                <div className="relative group" key="edit">
                    <Button
                        onClick={() => router.push(`/admin/branches/${branch.id}/edit`)}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                    <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('actions.edit')}
                    </div>
                </div>,
                <div className="relative group" key="delete">
                    <Button
                        onClick={() => handleDelete(branch)}
                        className="text-red-600 hover:text-red-900"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                    <div className="absolute left-0 w-32 p-2 text-sm text-white bg-black rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('actions.delete')}
                    </div>
                </div>
            ];
        }

        return commonActions;
    };

    const renderManagerView = () => {
        const branch = branches[0]; // Manager will only have one branch
        if (!branch) return null;

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm py-2 px-4">
                    <div className="flex items-center mb-4">
                        <h3 className="text-xl font-semibold text-primaryGreen">{t('pageTitle.manager')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Branch Info Card */}
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-gray-900">
                                {branch.name}
                            </h2>
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.city')}:</span> {branch.city}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.state')}:</span> {branch.state}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.zip')}:</span> {branch.zipCode}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.address')}:</span> {branch.address}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.contact')}:</span> {branch.phone}
                                </p>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-700">{t('branchDetails.status')}:</span>
                                    <span className={`border text-sm px-3 py-1 rounded-full ${branch.status === 'ACTIVE' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                                        {t(`status.${branch.status}`)}
                                    </span>
                                </div>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.managedBy')}:</span> {branch.manager ? branch.manager.fullName : 'No manager assigned'}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-semibold">{t('branchDetails.managerEmail')}:</span> {branch.manager ? branch.manager.email : 'No manager assigned'}
                                </p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-700">{t('quickActions')}</h3>
                            <div className="grid grid-cols-2 gap-4">

                                <Button
                                    onClick={() => router.push(`/admin/branches/${branch.id}/token-series`)}
                                    className="flex items-center justify-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 p-4 rounded-lg"
                                >
                                    {t('actions.tokenSeries')}
                                </Button>
                                <Button
                                    onClick={() => router.push(`/admin/branches/${branch.id}/employees`)}
                                    className="flex items-center justify-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 p-4 rounded-lg"
                                >
                                    <UserGroupIcon className="h-5 w-5" />
                                    {t('actions.employees')}
                                </Button>
                                <Button
                                    onClick={() => router.push(`/admin/branches/${branch.id}/desks`)}
                                    className="flex items-center justify-center gap-2 bg-orange-100 text-orange-700 hover:bg-orange-200 p-4 rounded-lg"
                                >
                                    <ComputerDesktopIcon className="h-5 w-5" />
                                    {t('actions.desks')}
                                </Button>
                                <Button
                                    onClick={() => router.push(`/admin/branches/${branch.id}/numerators`)}
                                    className="flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 p-4 rounded-lg"
                                >
                                    <WrenchScrewdriverIcon className="h-5 w-5" />
                                    {t('actions.manageNumerators')}
                                </Button>
                                <Button
                                    onClick={() => router.push(`/admin/branches/${branch.id}/services`)}
                                    className="flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 p-4 rounded-lg col-span-2"
                                >
                                    <WrenchScrewdriverIcon className="h-5 w-5" />
                                    {t('actions.services')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-6 bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)] px-4">
            {user?.role === 'SUPERADMIN' ? (
                // Existing SuperAdmin view
                <>
                    {renderHeader()}
                    {branches.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                            <p className="text-gray-600">{t('noBranchesFound')}</p>
                        </div>
                    ) : (
                        // Your existing table view
                        <div className="bg-white rounded-lg shadow-sm ">
                            {/* Search and Filter Controls */}
                            <div className="p-4 border-b border-gray-200 space-y-4">
                                <div className="flex flex-wrap gap-4 items-center justify-between">
                                    <div className="relative  w-1/2">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primaryGreen" />
                                        <input
                                            type="text"
                                            placeholder={t('searchPlaceholder')}
                                            className="pl-10 pr-4 py-2 w-full border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryGreen"
                                            onChange={(e) => debouncedSearch(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryGreen"
                                    >
                                        <option value="all">{t('table.allStatus')}</option>
                                        <option value="ACTIVE">{t('table.active')}</option>
                                        <option value="INACTIVE">{t('table.inactive')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                                <div className=" h-[calc(100vh-100px)] ">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                                onClick={() => handleSort('name')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {t('table.name')}
                                                    <ChevronUpDownIcon className="h-4 w-4" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('table.address')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('table.contact')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('table.managedBy')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('table.status')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {t('table.actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedBranches.map((branch) => (
                                            <tr key={branch.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {branch.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {branch.address}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {`${branch.city}, ${branch.state} ${branch.zipCode}`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {branch.phone}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {branch.manager ? (
                                                        <div className="text-sm">
                                                            <div className="font-medium text-gray-900">
                                                                {branch.manager.fullName}
                                                            </div>
                                                            <div className="text-gray-500">
                                                                {branch.manager.email}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-500 italic">
                                                           {t('table.noManager')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${branch.status === 'ACTIVE'
                                                            ? 'border border-activeBtn text-activeBtn'
                                                            : 'border border-inactiveBtn text-inactiveBtn'
                                                        }`}>
                                                        {t(`status.${branch.status}`)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-3">
                                                        {renderActions(branch)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
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
                        </div>
                    )}
                </>
            ) : (
                // Manager view
                renderManagerView()
            )}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, branchId: null, branchName: '' })}
                onConfirm={confirmDelete}
                title={t('deleteModal.title')}
                message={t('deleteModal.message', { branchName: deleteModal.branchName })}
                confirmText={t('deleteModal.confirmText')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}