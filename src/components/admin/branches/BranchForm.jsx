import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import branchService from '@/services/branchService';
import userService from '@/services/userService';
import { ApiError } from '@/lib/apiUtils';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
export default function BranchForm({ branch, mode = 'create' }) {
    const t = useTranslations('branchForm');
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [managers, setManagers] = useState([]);
    const [formData, setFormData] = useState({
        name: branch?.name || '',
        address: branch?.address || '',
        city: branch?.city || '',
        state: branch?.state || '',
        zipCode: branch?.zipCode || '',
        phone: branch?.phone || '',
        managerId: branch?.managerId?.toString() || '',
        status: branch?.status || 'ACTIVE'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadManagers();
    }, []);

    const loadManagers = async () => {
        try {
            const managersData = await userService.getManagers();
            const availableManagers = managersData.filter(manager => 
                !manager.managedBranch || 
                manager.managedBranch.id === branch?.id
            );
            setManagers(availableManagers);
        } catch (error) {
            console.error('Error loading managers:', error);
            toast.error(t('notifications.loadManagersError'));
            setManagers([]);
        }
    };

    const validateForm = () => {
        const errors = {};
        
        if (!formData.name?.trim()) errors.name = t('fields.name.error');
        if (!formData.address?.trim()) errors.address = t('fields.address.error');
        if (!formData.city?.trim()) errors.city = t('fields.city.error');
        if (!formData.state?.trim()) errors.state = t('fields.state.error');
        if (!formData.zipCode?.trim()) {
            errors.zipCode = t('fields.zipCode.error.required');
        } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
            errors.zipCode = t('fields.zipCode.error');
        }
        if (!formData.phone?.trim()) {
            errors.phone = t('fields.phone.error.required');
        } else if (!/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
            errors.phone = t('fields.phone.error.invalid');
        }
        
        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error(t('notifications.validateForm'));
            return;
        }

        try {
            setLoading(true);
            const loadingToast = toast.loading(
                mode === 'create' ? t('notifications.createLoading') : t('notifications.updateLoading')
            );

            const submitData = {
                ...formData,
                managerId: formData.managerId ? parseInt(formData.managerId) : null
            };

            if (mode === 'create') {
                await branchService.createBranch(submitData);
                toast.success(t('notifications.createSuccess'));
            } else {
                await branchService.updateBranch(branch.id, submitData);
                toast.success(t('notifications.updateSuccess'));
            }
            
            toast.dismiss(loadingToast);
            router.push('/admin/branches');
        } catch (error) {
            toast.error(error.message || t('notifications.error', { mode }));
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Branch Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.name.label')} *
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('fields.name.placeholder')}
                />
                {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
            </div>

            {/* Address */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.address.label')} *
                </label>
                <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={t('fields.address.placeholder')}
                />
                {errors.address && (
                    <p className="mt-1 text-sm text-red-500">{errors.address}</p>
                )}
            </div>

            {/* City and State */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.city.label')} *
                    </label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                            errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={t('fields.city.placeholder')}
                    />
                    {errors.city && (
                        <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.state.label')} *
                    </label>
                    <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                            errors.state ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={t('fields.state.placeholder')}
                    />
                    {errors.state && (
                        <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                    )}
                </div>
            </div>

            {/* ZIP and Phone */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.zipCode.label')} *
                    </label>
                    <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                            errors.zipCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={t('fields.zipCode.placeholder')}
                    />
                    {errors.zipCode && (
                        <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.phone.label')} *
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen ${
                            errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={t('fields.phone.placeholder')}
                    />
                    {errors.phone && (
                        <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                    )}
                </div>
            </div>

            {/* Manager Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.manager.label')}
                </label>
                <select
                    name="managerId"
                    value={formData.managerId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primaryGreen focus:border-primaryGreen"
                >
                        <option value="">{t('fields.manager.placeholder')}</option>
                    {managers.map((manager) => (
                        <option 
                            key={manager.id} 
                            value={manager.id}
                            disabled={manager.managedBranch && manager.managedBranch.id !== branch?.id}
                        >
                            {manager.fullName}
                            {manager.managedBranch && manager.managedBranch.id !== branch?.id 
                                ? t('fields.manager.alreadyAssigned') 
                                : ''}
                        </option>
                    ))}
                </select>
                <p className="mt-1 text-sm font-bold text-gray-500">
                    {t('fields.manager.note')}
                </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/admin/branches')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    {t('buttons.cancel')}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className={`px-4 py-2 bg-primaryOrange text-white rounded-lg hover:bg-primaryOrangeHover transition-colors disabled:bg-primaryOrangeHover ${
                        loading ? 'cursor-not-allowed' : ''
                    }`}
                >
                    {loading ? (
                        mode === 'create' ? t('buttons.creating') : t('buttons.updating')
                    ) : (
                        mode === 'create' ? t('buttons.create') : t('buttons.update')
                    )}
                </button>
            </div>
        </form>
    );
}