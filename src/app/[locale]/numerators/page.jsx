'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import numeratorService from '@/services/numeratorService';
import branchService from '@/services/branchService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export default function NumeratorPage() {
    const t = useTranslations('numeratorsList');
    const router = useRouter();
    const { user } = useAuth();
    const [numerators, setNumerators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupedNumerators, setGroupedNumerators] = useState({});
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resettingBranch, setResettingBranch] = useState(null);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNumerators();
        }
    }, [user]);

    const fetchNumerators = async () => {
        try {
            setLoading(true);
            
            if (user.role === 'MANAGER' && user.branchId) {
                const response = await numeratorService.getNumerators(user.branchId);
                if (Array.isArray(response)) {
                    const grouped = {
                        [user.branch?.name || 'My Branch']: {
                            branchId: user.branchId,
                            numerators: response
                        }
                    };
                    setGroupedNumerators(grouped);
                    setNumerators(response);
                }
            } 
            else if (user.role === 'SUPERADMIN') {
                const branchesResponse = await branchService.getAllBranches();
                
                if (branchesResponse.success && Array.isArray(branchesResponse.data)) {
                    const allNumerators = {};
                    for (const branch of branchesResponse.data) {
                        const branchNumerators = await numeratorService.getNumerators(branch.id);
                        if (Array.isArray(branchNumerators)) {
                            allNumerators[branch.name] = {
                                branchId: branch.id,
                                numerators: branchNumerators
                            };
                        }
                    }
                    setGroupedNumerators(allNumerators);
                    setNumerators(Object.values(allNumerators).flatMap(b => b.numerators));
                } else {
                    toast.error(t('notifications.branchError'));
                }
            }
        } catch (error) {
            console.error('Error fetching numerators:', error);
            toast.error(t('notifications.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateToken = (branchId) => {
        router.push(`/admin/branches/${branchId}/token-generation`);
    };

    const handleResetTokens = async (branchId, branchName) => {
        setResettingBranch({ id: branchId, name: branchName });
        setIsResetModalOpen(true);
    };

    const confirmReset = async () => {
        try {
            setIsResetting(true);
            const response = await fetch(`/api/branches/${resettingBranch.id}/tokens/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success(t('notifications.resetSuccess'));
                await fetchNumerators(); // Refresh the data
            } else {
                throw new Error(data.error || t('notifications.resetError'));
            }
        } catch (error) {
            console.error('Error resetting tokens:', error);
            toast.error(error.message || t('notifications.resetError'));
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
            setResettingBranch(null);
        }
    };

    // Filter numerators based on search term
    const filteredNumerators = Object.entries(groupedNumerators).reduce((acc, [branchName, data]) => {
        const filtered = data.numerators.filter(numerator => 
            numerator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(numerator.serialNo).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filtered.length > 0) {
            acc[branchName] = {
                ...data,
                numerators: filtered
            };
        }
        return acc;
    }, {});

    if (loading) return <LoadingSpinner />;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-5">
                <div className="flex justify-center items-center mb-4">
                    <h1 className="text-xl font-semibold text-primaryGreen">{t('title')}</h1>
                </div>
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search.placeholder')}
                            className="pl-10 outline-none pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primaryGreen"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {Object.entries(filteredNumerators).length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex items-center justify-center bg-white rounded-lg shadow-md p-6">
                    {t('noNumerators')}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(filteredNumerators).map(([branchName, data]) => (
                        <div key={branchName} className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-primaryGreen">{branchName}</h2>
                                <button
                                    onClick={() => handleResetTokens(data.branchId, branchName)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                                >
                                    {t('buttons.resetTokens')}
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.numerators.map(numerator => (
                                    <div 
                                        key={numerator.id}
                                        className="bg-white border-2 border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-primaryOrange transition-all duration-200"
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {numerator.name}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {t('numerator.serialNo', { number: numerator.serialNo })}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                numerator.status === 'ACTIVE'
                                                    ? 'border border-activeBtn text-activeBtn'
                                                    : 'border border-inactiveBtn text-inactiveBtn'
                                            }`}>
                                                {t(`numerator.status.${numerator.status}`)}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => handleGenerateToken(data.branchId)}
                                            className={`w-full bg-primaryOrange hover:bg-primaryOrangeHover text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                                                numerator.status === 'INACTIVE' ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                            disabled={numerator.status === 'INACTIVE'}
                                        >
                                            {t('buttons.generateToken')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reset Confirmation Modal */}
            <Transition show={isResetModalOpen} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-50"
                    onClose={() => !isResetting && setIsResetModalOpen(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex items-center justify-center mb-4 text-red-500">
                                        <ExclamationTriangleIcon className="h-12 w-12" />
                                    </div>
                                    
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900 text-center"
                                    >
                                        {t('resetModal.title')}
                                    </Dialog.Title>

                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 text-center">
                                            {t('resetModal.description', { branch: resettingBranch?.name })}
                                        </p>
                                    </div>

                                    <div className="mt-6 flex justify-center space-x-4">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsResetModalOpen(false)}
                                            disabled={isResetting}
                                        >
                                            {t('resetModal.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            className={`inline-flex justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                                                isResetting ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                            onClick={confirmReset}
                                            disabled={isResetting}
                                        >
                                            {isResetting ? t('resetModal.resetting') : t('resetModal.confirm')}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}