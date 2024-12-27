'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import tokenSeriesService from '@/services/tokenSeriesService';
import { AlertCircle, RefreshCcw } from 'lucide-react'; 
import { useTranslations } from 'next-intl';

export default function TokenSeriesManagement() {
    const { branchId } = useParams();
    const router = useRouter();
    const t = useTranslations('tokenSeries');
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState([]);
    const [tokenSeries, setTokenSeries] = useState([]);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [newSeries, setNewSeries] = useState({
        serviceId: '',
        prefix: '',
        startFrom: 1,
        endAt: 100,
        active: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingSeries, setEditingSeries] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [branchId, retryCount]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            
            const [seriesData, servicesData] = await Promise.all([
                tokenSeriesService.getBranchTokenSeries(branchId),
                tokenSeriesService.getBranchServices(branchId)
            ]);
            
            
            setTokenSeries(seriesData || []);
            setServices(servicesData || []);
            
        } catch (error) {
            console.error('Error loading data:', error);
            setError({
                message: error.message || 'An unexpected error occurred',
                retryable: error.retryable ?? true,
                status: error.status,
                details: error.details
            });
            toast.error(error.message || t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            
            const formData = {
                ...newSeries,
                serviceId: parseInt(newSeries.serviceId),
                branchId: parseInt(branchId)
            };

            await tokenSeriesService.createTokenSeries(branchId, formData);
            
            toast.success(t('notifications.createSuccess'));
            setIsAddingNew(false);
            setNewSeries({
                serviceId: '',
                prefix: '',
                startFrom: 1,
                endAt: 100,
                active: true
            });
            
            await loadData();
            
        } catch (error) {
            console.error('Error creating token series:', error);
            
            if (error.status === 401) {
                router.push('/login');
                return;
            }

            // Show the specific error message
            toast.error(error.message || t('notifications.createError'));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (seriesId, currentStatus) => {
        try {
            // Optimistically update the UI
            setTokenSeries(prevSeries => 
                prevSeries.map(series => 
                    series.id === seriesId 
                        ? { ...series, active: !currentStatus }
                        : series
                )
            );

            // Make the API call
            await tokenSeriesService.updateTokenSeriesStatus(
                branchId, 
                seriesId, 
                !currentStatus
            );
            
            // Show success message
            toast.success(t('notifications.statusToggle', { status: currentStatus ? 'deactivated' : 'activated' }));
            
            // Refresh the data to ensure we have the latest state
            await loadData();
        } catch (error) {
            console.error('Error toggling status:', error);
            
            // Revert the optimistic update
            setTokenSeries(prevSeries => 
                prevSeries.map(series => 
                    series.id === seriesId 
                        ? { ...series, active: currentStatus }
                        : series
                )
            );
            
            // Show error message
            toast.error(error.message || t('notifications.statusToggleError'));
        }
    };

    const handleEdit = (series) => {
        setEditingSeries(series);
        setIsEditing(true);
    };

    const handleDelete = async (seriesId) => {
        if (!window.confirm(t('notifications.deleteConfirm'))) {
            return;
        }

        try {
            await tokenSeriesService.deleteTokenSeries(branchId, seriesId);
            toast.success(t('notifications.deleteSuccess'));
            await loadData();
        } catch (error) {
            console.error('Error deleting token series:', error);
            toast.error(error.message || t('notifications.deleteError'));
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            
            // Validate the data before sending
            if (!editingSeries.serviceId || !editingSeries.prefix) {
                toast.error(t('notifications.validation'));
                return;
            }

            const updateData = {
                ...editingSeries,
                serviceId: parseInt(editingSeries.serviceId),
                startFrom: parseInt(editingSeries.startFrom),
                endAt: parseInt(editingSeries.endAt),
                prefix: editingSeries.prefix.toUpperCase()
            };

            // Optimistically update the UI
            setTokenSeries(prevSeries => 
                prevSeries.map(series => 
                    series.id === editingSeries.id 
                        ? { ...series, ...updateData }
                        : series
                )
            );

            await tokenSeriesService.updateTokenSeries(
                branchId, 
                editingSeries.id, 
                updateData
            );
            
            toast.success(t('notifications.updateSuccess'));
            setIsEditing(false);
            setEditingSeries(null);
            
            // Refresh the data to ensure we have the latest state
            await loadData();
        } catch (error) {
            console.error('Error updating token series:', error);
            
            // Revert optimistic update
            await loadData();
            
            if (error.status === 401) {
                router.push('/login');
                return;
            }

            toast.error(error.message || t('notifications.updateError'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                    <div className="flex items-center mb-4">
                        <AlertCircle className="text-red-500 mr-2" size={24} />
                        <h2 className="text-lg font-semibold text-red-700">
                            {error.status ? `Error (${error.status})` : 'Error'}
                        </h2>
                    </div>
                    <p className="text-red-600 mb-4">{error.message}</p>
                    {error.details && (
                        <p className="text-sm text-red-500 mb-4">{error.details}</p>
                    )}
                    {error.retryable && (
                        <div className="flex justify-center">
                            <Button 
                                onClick={handleRetry}
                                className="bg-green-600 px hover:bg-green-700 text-white flex items-center rounded-lg px-4 py-2"
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                {t('buttons.tryAgain')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className=" p-6 bg-white rounded-lg shadow-sm py-4 h-[calc(100vh-100px)]" >
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl text-gray-600 font-semibold">{t('title')}</h1>
                    <p className="text-gray-600 text-sm mt-1">
                        {t('stats.servicesAvailable', { count: services.length })}
                    </p>
                </div>
                <Button 
                    onClick={() => setIsAddingNew(true)}
                    className="bg-primaryOrange hover:bg-primaryOrangeHover text-white rounded-lg px-4 py-2"
                >
                    {t('buttons.addNew')}
                </Button>
            </div>

            {tokenSeries.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('emptyState.title')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {services.length > 0 
                            ? t('emptyState.withServices')
                            : t('emptyState.noServices')}
                    </p>
                    {services.length > 0 && (
                        <Button 
                            onClick={() => setIsAddingNew(true)}
                            className="bg-primaryOrange hover:bg-primaryOrangeHover text-white rounded-lg px-4 py-2 mt-4"
                        >
                            {t('buttons.createFirst')}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg mt-8 shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.service')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.prefix')}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.currentNumber')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.range')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.status')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tokenSeries.map((series) => (
                                <tr key={series.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {series.service.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {series.prefix}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        {series.currentNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {series.startFrom} - {series.endAt}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            series.active
                                                ? 'border border-activeBtn text-activeBtn'
                                                : 'border border-inactiveBtn text-inactiveBtn'
                                        }`}>
                                            {series.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-2">
                                            <Button
                                                onClick={() => handleToggleStatus(series.id, series.active)}
                                                className={`${
                                                    series.active
                                                        ? 'border border-inactiveBtn text-inactiveBtn hover:bg-inactiveBtn hover:text-white'
                                                        : 'border border-activeBtn text-activeBtn hover:bg-activeBtn hover:text-white'
                                                } px-2 py-1 rounded-md `}
                                            >
                                                {series.active ? t('buttons.deactivate') : t('buttons.activate')}
                                            </Button>
                                            <Button
                                                onClick={() => handleEdit(series)}
                                                className="border border-primaryGreen hover:bg-primaryGreen hover:text-white text-primaryGreen px-2 py-1 rounded-md"
                                            >
                                                {t('buttons.edit')}
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(series.id)}
                                                className="border border-red-500 hover:bg-red-500 hover:text-white text-red-500 px-2 py-1 rounded-md"
                                            >
                                                {t('buttons.delete')}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(isAddingNew || isEditing) && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
                    <div className="bg-transparent flex justify-center items-center w-full h-full overflow-y-auto">
                        <div className="container bg-white w-1/2 mx-auto rounded-lg px-6 py-6 overflow-y-auto">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                               
                                <h3 className="text-xl font-semibold text-primaryGreen mx-auto">
                                    {isEditing ? t('tokenSeriesForm.title.edit') : t('tokenSeriesForm.title.create')}
                                </h3>
                            </div>

                            {/* Form */}
                            <form onSubmit={isEditing ? handleEditSubmit : handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Service Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('tokenSeriesForm.fields.service.label')}
                                        </label>
                                        <select
                                            value={isEditing ? editingSeries.serviceId : newSeries.serviceId}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    setEditingSeries({
                                                        ...editingSeries,
                                                        serviceId: e.target.value
                                                    });
                                                } else {
                                                    setNewSeries({
                                                        ...newSeries,
                                                        serviceId: e.target.value
                                                    });
                                                }
                                            }}
                                            className="w-full rounded-lg border-2 px-3 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                                            required
                                        >
                                            <option value="">{t('tokenSeriesForm.fields.service.placeholder')}</option>
                                            {services.map((service) => (
                                                <option key={service.id} value={service.id}>
                                                    {service.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Prefix */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('tokenSeriesForm.fields.prefix.label')}
                                        </label>
                                        <input
                                            type="text"
                                            value={isEditing ? editingSeries.prefix : newSeries.prefix}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                if (isEditing) {
                                                    setEditingSeries({
                                                        ...editingSeries,
                                                        prefix: value
                                                    });
                                                } else {
                                                    setNewSeries({
                                                        ...newSeries,
                                                        prefix: value
                                                    });
                                                }
                                            }}
                                            className="w-full rounded-lg border-2 px-3 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                                            required
                                            maxLength={3}
                                            placeholder={t('tokenSeriesForm.fields.prefix.placeholder')}
                                        />
                                    </div>

                                    {/* Start From */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('tokenSeriesForm.fields.startFrom.label')}
                                        </label>
                                        <input
                                            type="number"
                                            value={isEditing ? editingSeries.startFrom : newSeries.startFrom}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (isEditing) {
                                                    setEditingSeries({
                                                        ...editingSeries,
                                                        startFrom: value
                                                    });
                                                } else {
                                                    setNewSeries({
                                                        ...newSeries,
                                                        startFrom: value
                                                    });
                                                }
                                            }}
                                            className="w-full rounded-lg border-2 px-3 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                                            required
                                            min="1"
                                        />
                                    </div>

                                    {/* End At */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {t('tokenSeriesForm.fields.endAt.label')}
                                        </label>
                                        <input
                                            type="number"
                                            value={isEditing ? editingSeries.endAt : newSeries.endAt}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (isEditing) {
                                                    setEditingSeries({
                                                        ...editingSeries,
                                                        endAt: value
                                                    });
                                                } else {
                                                    setNewSeries({
                                                        ...newSeries,
                                                        endAt: value
                                                    });
                                                }
                                            }}
                                            className="w-full rounded-lg border-2 px-3 py-2 outline-none border-gray-300 focus:border-primaryGreen focus:ring-primaryGreen"
                                            required
                                            min={isEditing ? editingSeries.startFrom + 1 : newSeries.startFrom + 1}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3 pt-6">
                                    <Button
                                        type="button"
                                        onClick={() => isEditing ? setIsEditing(false) : setIsAddingNew(false)}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('tokenSeriesForm.buttons.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-primaryOrange hover:bg-primaryOrangeHover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                                {isEditing ? t('tokenSeriesForm.buttons.updating') : t('tokenSeriesForm.buttons.creating')}
                                            </>
                                        ) : (
                                            isEditing ? t('tokenSeriesForm.buttons.update') : t('tokenSeriesForm.buttons.create')
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}