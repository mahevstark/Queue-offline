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

    if (userLoading || loading) {
        return <LoadingSpinner />;
    }

    if (!user || ![ 'MANAGER'].includes(user.role)) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">{t('unauthorized')}</p>
            </div>
        );
    }

    const renderManagerView = () => {
        // If manager has no branches, show message
        if (!branches || branches.length === 0) {
            return (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <p className="text-gray-600">{t('noBranchesFound')}</p>
                </div>
            );
        }

        const branch = branches[0];
        
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
                             
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 space-y-6 bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)] px-4">
            {/* Manager view */}
            {renderManagerView()}
        </div>
    );
}