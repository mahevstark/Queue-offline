'use client'
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useParams } from 'next/navigation';
import numeratorService from '@/services/numeratorService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import {Modal} from '@/components/ui/Modal';
import { 
    PencilSquareIcon, 
    TrashIcon, 
    MagnifyingGlassIcon,
    PlusIcon 
} from '@heroicons/react/24/outline';
import  ConfirmationModal  from '@/components/ui/ConfirmationModal';
import { useTranslations } from 'next-intl';

export default function NumeratorManagerPage() {
    const params = useParams();
    const { user, isLoading: userLoading } = useAuth();
    const [numerators, setNumerators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNumerator, setEditingNumerator] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        serialNo: '',
        status: 'ACTIVE'
    });
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [numeratorToDelete, setNumeratorToDelete] = useState(null);
    const t = useTranslations('numerators');

    const branchId = parseInt(params.branchId);

    useEffect(() => {
        if (branchId && !userLoading) {
            fetchNumerators();
        }
    }, [branchId, userLoading]);

    const fetchNumerators = async () => {
        try {
            setLoading(true);
            const response = await numeratorService.getNumerators(branchId);
            
            // Check if response is an array
            if (Array.isArray(response)) {
                setNumerators(response);
            } else {
                toast.error(t('notifications.loadError'));
            }
        } catch (error) {
            console.error('Error fetching numerators:', error);
            toast.error(t('notifications.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'serialNo' ? parseInt(value) || '' : value
        }));
    };

    const openModal = (numerator = null) => {
        if (numerator) {
            setEditingNumerator(numerator);
            setFormData({
                name: numerator.name,
                serialNo: numerator.serialNo,
                status: numerator.status
            });
        } else {
            setEditingNumerator(null);
            setFormData({ name: '', serialNo: '', status: 'ACTIVE' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingNumerator(null);
        setFormData({ name: '', serialNo: '', status: 'ACTIVE' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const serialNo = parseInt(formData.serialNo);
            
            // Check for existing serial number
            const existingNumerator = numerators.find(
                n => n.serialNo === serialNo && (!editingNumerator || n.id !== editingNumerator.id)
            );
            if (existingNumerator) {
                toast.error(t('notifications.duplicateSerial'));
                return;
            }

            let response;
            if (editingNumerator) {
                response = await numeratorService.updateNumerator(branchId, editingNumerator.id, {
                    name: formData.name.trim(),
                    serialNo: serialNo,
                    status: formData.status
                });
            } else {
                response = await numeratorService.createNumerator(branchId, {
                    name: formData.name.trim(),
                    serialNo: serialNo,
                    status: formData.status
                });
            }

            if (response && typeof response.id === 'number') {
                if (editingNumerator) {
                    setNumerators(prev => prev.map(n => n.id === response.id ? response : n));
                    toast.success(t('notifications.updateSuccess'));
                } else {
                    setNumerators(prev => [...prev, response]);
                    toast.success(t('notifications.createSuccess'));
                }
                closeModal();
            } else {
                toast.error(t('notifications.updateError'));
            }
        } catch (error) {
            console.error(`Error ${editingNumerator ? 'updating' : 'adding'} numerator:`, error);
            toast.error(t('notifications.updateError'));
        }
    };

    const handleDelete = async (id) => {
        setNumeratorToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        try {
            if (!numeratorToDelete) return;
            const response = await numeratorService.deleteNumerator(branchId, numeratorToDelete);
            
            // For delete operations, we just need to check if the request was successful
            if (response && response.success) {
                setNumerators(prev => prev.filter(n => n.id !== numeratorToDelete));
                toast.success(t('notifications.deleteSuccess'));
            } else {
                toast.error(t('notifications.deleteError'));
            }
        } catch (error) {
            console.error('Error deleting numerator:', error);
            toast.error(t('notifications.deleteError'));
        } finally {
            setIsDeleteDialogOpen(false);
            setNumeratorToDelete(null);
        }
    };

    const filteredNumerators = numerators.filter(numerator =>
        numerator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        numerator.serialNo.toString().includes(searchTerm)
    );

    if (userLoading || loading) return <LoadingSpinner />;

    if (!user || !['SUPERADMIN', 'MANAGER'].includes(user.role)) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">{t('notifications.unauthorized')}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-primaryGreen">{t('title')}</h2>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-primaryGreen text-white rounded-lg hover:bg-primaryGreenHover transition-colors flex items-center gap-2"
                    >
                        <PlusIcon className="h-5 w-5" />
                        {t('buttons.add')}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primaryGreen outline-none"
                    />
                </div>
                {/* Numerators Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.name')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t('table.headers.serialNo')}
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
                            {filteredNumerators.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                        {t('table.noNumerators')}
                                    </td>
                                </tr>
                            ) : (
                                filteredNumerators.map(numerator => (
                                    <tr key={numerator.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {numerator.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {numerator.serialNo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                numerator.status === 'ACTIVE' 
                                                    ? 'border border-activeBtn text-activeBtn' 
                                                    : 'border border-inactiveBtn text-inactiveBtn'
                                            }`}>
                                                {numerator.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => openModal(numerator)}
                                                className="text-blue-600 hover:text-blue-800 mr-4"
                                            >
                                                <PencilSquareIcon className="h-5 w-5 inline-block" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(numerator.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <TrashIcon className="h-5 w-5 inline-block" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Add/Edit Modal */}
                <Modal isOpen={isModalOpen} onClose={closeModal}>
                    <h3 className="text-lg text-primaryGreen font-semibold mb-4">
                        {editingNumerator ? t('buttons.edit') : t('buttons.add')}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('form.fields.name.label')}
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primaryGreen outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('form.fields.serialNo.label')}
                            </label>
                            <input
                                type="number"
                                name="serialNo"
                                value={formData.serialNo}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primaryGreen outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('form.fields.status.label')}
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primaryGreen outline-none"
                                required
                            >
                                <option value="ACTIVE">{t('form.fields.status.options.active')}</option>
                                <option value="INACTIVE">{t('form.fields.status.options.inactive')}</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                {t('buttons.cancel')}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primaryGreen text-white rounded-lg hover:bg-primaryGreenHover transition-colors"
                            >
                                {editingNumerator ? t('buttons.update') : t('buttons.add')}
                            </button>
                        </div>
                    </form>
                </Modal>

                <ConfirmationModal
                    isOpen={isDeleteDialogOpen}
                    onClose={() => {
                        setIsDeleteDialogOpen(false);
                        setNumeratorToDelete(null);
                    }}
                    onConfirm={confirmDelete}
                    title={t('modal.title')}
                    message={t('modal.message')}
                    confirmText={t('modal.confirmButton')}
                    confirmButtonClass="bg-red-600 hover:bg-red-700"
                />
            </div>
        </div>
    );
}