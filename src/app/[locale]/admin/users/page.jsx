'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { UserTable } from './UserTable';
import { UserModal } from './UserModal';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import userService from '@/services/userService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import debounce from 'lodash/debounce';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import branchService from '@/services/branchService';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useTranslations } from 'next-intl';

export default function UsersPage() {
    const t = useTranslations('usersPage');
    // State Management
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const isSuperAdmin = user?.role === 'SUPERADMIN';

    // Filtering and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [branchFilter, setBranchFilter] = useState('all');
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const router = useRouter();

    // Add this state for delete confirmation
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        userId: null,
        userName: ''
    });

    // Fetch Users
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error(t('notifications.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    // Fetch branches
    const fetchBranches = async () => {
        try {
            setBranchesLoading(true);
            const response = await branchService.getAllBranches();
            // Ensure we're working with an array
            const branchesData = Array.isArray(response.data) ? response.data :
                Array.isArray(response) ? response : [];

            setBranches(branchesData);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
            toast.error(t('notifications.branchError'));
            setBranches([]); // Set empty array as fallback
        } finally {
            setBranchesLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchBranches();
            fetchUsers();
        }
    }, [user]);

    // Filtering and Sorting Logic
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = [...users];

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(user =>
                user.fullName?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower) ||
                user.branch?.name?.toLowerCase().includes(searchLower)
            );
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user =>
                user.role?.toUpperCase() === roleFilter.toUpperCase()
            );
        }

        // Apply branch filter - Convert branchFilter to number for comparison
        if (branchFilter !== 'all') {
            filtered = filtered.filter(user =>
                user.branch?.id === parseInt(branchFilter)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle nested properties
            if (sortConfig.key === 'branchName') {
                aValue = a.branch?.name || '';
                bValue = b.branch?.name || '';
            }

            // Handle status sorting
            if (sortConfig.key === 'status') {
                aValue = a.status || '';
                bValue = b.status || '';
            }

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
    }, [users, searchTerm, roleFilter, branchFilter, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredAndSortedUsers.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    // Add a useEffect to handle page changes when filtered results change
    useEffect(() => {
        const maxPage = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
        if (currentPage > maxPage) {
            setCurrentPage(Math.max(1, maxPage));
        }
    }, [filteredAndSortedUsers.length, itemsPerPage]);

    // Debounced search handler
    const debouncedSearch = debounce((value) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to first page on search
    }, 300);

    // Event Handlers
    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const handleModalSubmit = async (formData) => {
        try {
            setLoading(true);
            if (selectedUser) {
                await userService.updateUser(selectedUser.id, {
                    ...formData,
                    branchId: formData.branchId ? parseInt(formData.branchId) : null
                });
                toast.success(t('modal.edit.success'));
            } else {
                await userService.createUser({
                    ...formData,
                    branchId: formData.branchId ? parseInt(formData.branchId) : null
                });
                toast.success(t('modal.add.success'));
            }
            setIsModalOpen(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Operation failed:', error);
            toast.error(error.message || t('notifications.updateError'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = (user) => {
        setDeleteConfirmation({
            isOpen: true,
            userId: user.id,
            userName: user.fullName
        });
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            await userService.deleteUser(deleteConfirmation.userId);
            toast.success(t('modal.delete.success'));
            await fetchUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error(error.message || t('notifications.deleteError'));
        } finally {
            setLoading(false);
            setDeleteConfirmation({ isOpen: false, userId: null, userName: '' });
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    // Add handler for viewing logs
    const handleViewLogs = (userId) => {
        router.push(`/admin/user-logs/${userId}`);
    };

    // Get role options based on user role
    const getRoleOptions = () => {
        if (user?.role === 'MANAGER') {
            return [
                { value: 'all', label: t('filters.role.all') },
                { value: 'EMPLOYEE', label: t('filters.role.EMPLOYEE') }
            ];
        }
        return [
            { value: 'all', label: t('filters.role.all') },
            { value: 'MANAGER', label: t('filters.role.MANAGER') },
            { value: 'EMPLOYEE', label: t('filters.role.EMPLOYEE') }
        ];
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex-1 space-y-6 bg-white p-4 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg text-gray-500 font-medium">
                    {isSuperAdmin ? t('title.superadmin') : t('title.manager')}
                </h3>
            </div>

            {/* Filters Section */}
            <div className="bg-white px-6 py-2 rounded-lg shadow-sm space-y-2">
                <div className={`grid ${isSuperAdmin ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-4 justify-between items-center`}>
                    {/* Search */}
                    <div className="relative flex items-center gap-2">
                        <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-primaryGreen" />
                        <input
                            type="search"
                            placeholder={t('filters.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 outline-none border-2 px-4 py-2 rounded-lg border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                        />
                    </div>

                    {/* Filters */}
                    {isSuperAdmin && (
                        <div className="flex gap-2 justify-center">
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-1/2 border-2 rounded-lg px-4 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                            >
                                {getRoleOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={branchFilter}
                                onChange={(e) => {
                                    setBranchFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                disabled={branchesLoading}
                                className="w-1/2 float-right border-2 rounded-lg px-4 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="all">
                                    {branchesLoading ? t('filters.branch.loading') : t('filters.branch.all')}
                                </option>
                                {!branchesLoading && branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name || t('filters.branch.unnamed')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Add Button */}
                    <div className={`flex justify-end ${!isSuperAdmin && 'md:col-start-2'}`}>
                        <Button
                            onClick={handleAddNew}
                            className="bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 w-max rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                            {isSuperAdmin ? t('form.buttons.addUser') : t('form.buttons.addEmployee')}
                        </Button>
                    </div>
                </div>

                {/* Results Summary */}
                <div className="text-sm text-gray-600">
                    {t('pagination.showing', {
                        start: startIndex + 1,
                        end: Math.min(startIndex + itemsPerPage, filteredAndSortedUsers.length),
                        total: filteredAndSortedUsers.length
                    })} {isSuperAdmin ? t('pagination.user') : t('pagination.employee')}
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-lg shadow-sm">
                <UserTable
                    users={paginatedUsers}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewLogs={handleViewLogs}
                    onSort={handleSort}
                    sortConfig={sortConfig}
                    userRole={user?.role}
                />
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
                        className="bg-primaryOrange hover:bg-primaryOrangeHover disabled:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </Button>
                    <span className="text-sm text-gray-600 px-4">
                        {currentPage} {t('pagination.of')} {totalPages}
                    </span>
                    <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="bg-primaryOrange hover:bg-primaryOrangeHover disabled:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <ChevronRightIcon className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Modals */}
            <UserModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                user={selectedUser}
                userRole={user?.role}
            />

            <ConfirmationModal
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, userId: null, userName: '' })}
                onConfirm={confirmDelete}
                title={t('modal.delete.title')}
                message={t('modal.delete.message', { userName: deleteConfirmation.userName })}
                confirmText={t('modal.delete.confirm')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}