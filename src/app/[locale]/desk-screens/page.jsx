'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import branchService from '@/services/branchService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';

export default function DeskScreensPage() {
    const t = useTranslations('deskScreens');
    const router = useRouter();
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        city: 'all'
    });
    const [cities, setCities] = useState([]);

    useEffect(() => {
        if (user) {
            fetchBranches();
        }
    }, [user]);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const response = await branchService.getAllBranches();
            
            if (response.success) {
                let branchesData = response.data;
                
                if (user?.role === 'MANAGER') {
                    const managerId = parseInt(user.id);
                    branchesData = branchesData.filter(branch => branch.managerId === managerId);
                    
                    if (branchesData.length === 0) {
                        toast.error(t('notifications.noBranchesAssigned'));
                    }
                }

                const branchesWithDesks = branchesData.map(branch => ({
                    ...branch,
                    desks: branch.desks || []
                }));
                
                setBranches(branchesWithDesks);
                
                if (user?.role === 'SUPERADMIN') {
                    const uniqueCities = [...new Set(branchesData.map(branch => branch.city))];
                    setCities(uniqueCities);
                }
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error(t('notifications.fetchError'));
        } finally {
            setLoading(false);
        }
    };

    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.city.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCity = filters.city === 'all' || branch.city === filters.city;

        const matchesStatus = filters.status === 'all' || branch.status === filters.status;

        return matchesSearch && matchesCity && matchesStatus;
    });

    const renderManagerView = () => {
        const branch = branches[0];
        
        if (!branch) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-gray-500 text-lg">{t('noBranches.assigned')}</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{branch.name}</h2>
                            <p className="text-gray-600">{branch.city}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            branch.status === 'ACTIVE' ? 'border border-activeBtn text-activeBtn' : 'border border-inactiveBtn text-inactiveBtn'
                        }`}>
                            {t(`branch.status.${branch.status}`)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {branch.desks
                            .filter(desk => desk.status === 'ACTIVE')
                            .map((desk) => (
                                <div 
                                    key={desk.id} 
                                    onClick={() => router.push(`/desk-screen/${desk.id}`)}
                                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 hover:border-primaryOrange transition-colors cursor-pointer border border-gray-200"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <ComputerDesktopIcon className="h-6 w-6 text-primaryGreen" />
                                        <h3 className="font-medium text-gray-900">{desk.name}</h3>
                                    </div>
                             
                                </div>
                            ))}
                    </div>

                    {branch.desks.filter(desk => desk.status === 'ACTIVE').length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                            {t('noBranches.noDesks')}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="mt-2 text-gray-600">
                            {t(`subtitle.${user?.role === 'MANAGER' ? 'manager' : 'admin'}`)}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-gray-600">{t('stats.activeDesks')}</div>
                            <div className="text-2xl font-semibold text-primaryGreen">
                                {branches.reduce((acc, branch) => 
                                    acc + branch.desks.filter(desk => desk.status === 'ACTIVE').length, 0
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {user?.role === 'MANAGER' ? (
                renderManagerView()
            ) : (
                <>
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('filters.search')}
                                    className="pl-10 w-full py-2 rounded-lg border outline-none border-gray-200 focus:border-primaryGreen focus:ring-primaryGreen transition-colors duration-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                className="w-full rounded-lg px-4 py-2 border outline-none border-gray-200 focus:border-primaryGreen focus:ring-primaryGreen transition-colors duration-200"
                                value={filters.city}
                                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                            >
                                <option value="all">{t('filters.cities.all')}</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            <select
                                className="w-full rounded-lg px-4 py-2 border outline-none border-gray-200 focus:border-primaryGreen focus:ring-primaryGreen transition-colors duration-200"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="all">{t('filters.status.all')}</option>
                                <option value="ACTIVE">{t('filters.status.active')}</option>
                                <option value="INACTIVE">{t('filters.status.inactive')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {filteredBranches.length > 0 ? (
                            filteredBranches.map((branch) => (
                                <div key={branch.id} 
                                    className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200"
                                >
                                    <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-xl font-semibold text-gray-900">{branch.name}</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-gray-600">{branch.city}</span>
                                                    <span className={` ${
                                                        branch.status === 'ACTIVE' 
                                                            ? 'text-activeBtn' 
                                                            : 'text-inactiveBtn'
                                                    }`}>•</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        branch.status === 'ACTIVE' 
                                                            ? 'border border-activeBtn text-activeBtn' 
                                                            : 'border border-inactiveBtn text-inactiveBtn'
                                                    }`}>
                                                        {t(`branch.status.${branch.status}`)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600">{t('branch.activeDesks')}</div>
                                                <div className="text-lg font-semibold text-primaryGreen">
                                                    {branch.desks.filter(desk => desk.status === 'ACTIVE').length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {branch.desks
                                                .filter(desk => desk.status === 'ACTIVE')
                                                .map((desk) => (
                                                    <div 
                                                        key={desk.id} 
                                                        onClick={() => router.push(`/desk-screen/${desk.id}`)}
                                                        className="group bg-gray-50 rounded-xl p-4 hover:bg-primaryGreen/5 transition-all duration-200 cursor-pointer border border-gray-200 hover:border-primaryGreen"
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <ComputerDesktopIcon className="h-6 w-6 text-primaryGreen group-hover:scale-110 transition-transform duration-200" />
                                                            <h3 className="font-medium text-gray-900 group-hover:text-primaryGreen transition-colors duration-200">
                                                                {desk.name}
                                                            </h3>
                                                        </div>
                                                        
                                                    </div>
                                                ))}
                                        </div>

                                        {branch.desks.filter(desk => desk.status === 'ACTIVE').length === 0 && (
                                            <div className="text-center py-8 text-gray-500">
                                                {t('noBranches.noDesks')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                <div className="text-gray-500">
                                    {t('noBranches.filtered')}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}