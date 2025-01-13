'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import numeratorService from '@/services/numeratorService';
import branchService from '@/services/branchService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

export default function NumeratorPage() {
    const t = useTranslations('numeratorsList');
    const router = useRouter();
    const { user } = useAuth();
    const [numerators, setNumerators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [groupedNumerators, setGroupedNumerators] = useState({});

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
                            <h2 className="text-xl font-semibold text-primaryGreen mb-4">{branchName}</h2>
                            
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
        </div>
    );
}