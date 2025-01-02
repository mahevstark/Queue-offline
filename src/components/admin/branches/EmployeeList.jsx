import { useState, useMemo } from 'react';
import { UserPlusIcon, UserMinusIcon, XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import branchService from '@/services/branchService';
import { useTranslations } from 'next-intl';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function EmployeeList({
    branchId,
    employees = [],
    availableEmployees = [],
    onEmployeeUpdate,
    branchName
}) {
    const t = useTranslations('branchEmployees');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);

    // Filter and search functionality
    const filteredEmployees = useMemo(() => {
        return employees.filter(employee => {
            return employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   employee.email.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [employees, searchTerm]);

    // Add this new useMemo for filtering available employees
    const filteredAvailableEmployees = useMemo(() => {
        return availableEmployees.filter(employee => {
            return employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   employee.email.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [availableEmployees, searchTerm]);

    const handleAdd = async (employeeId) => {
        try {
            setLoading(true);
            setSelectedEmployee(employeeId);
            await branchService.addEmployeeToBranch(branchId, employeeId);
            
            if (typeof onEmployeeUpdate === 'function') {
                await onEmployeeUpdate();
            }
            
            setShowAddModal(false);
            toast.success(t('notifications.addSuccess'));
        } catch (error) {
            console.error('Error adding employee:', error);
            toast.error(error.message || t('notifications.addError'));
        } finally {
            setLoading(false);
            setSelectedEmployee(null);
        }
    };

    const handleRemove = async (employeeId) => {
        setEmployeeToDelete(employeeId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            setSelectedEmployee(employeeToDelete);
            await branchService.removeEmployeeFromBranch(branchId, employeeToDelete);
            
            if (typeof onEmployeeUpdate === 'function') {
                await onEmployeeUpdate();
            }
            
            toast.success(t('notifications.removeSuccess'));
        } catch (error) {
            console.error('Error removing employee:', error);
            toast.error(error.message || t('notifications.removeError'));
        } finally {
            setLoading(false);
            setSelectedEmployee(null);
            setShowDeleteModal(false);
            setEmployeeToDelete(null);
        }
    };

    return (
        <div >
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex-1 w-full sm:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('search.placeholder')}
                            className="w-1/2 pl-10 pr-4 py-2 border outline-none rounded-lg focus:ring-1 focus:ring-primaryGreen focus:border-primaryGreen"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 text-primaryGreen" />
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primaryOrange hover:bg-primaryOrangeHover transition-colors disabled:bg-primaryOrangeHover"
                        disabled={loading}
                    >
                        <UserPlusIcon className="h-5 w-5 mr-2" />
                        {t('buttons.addEmployee')}
                    </button>
                </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {filteredEmployees.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                        {t('table.noEmployees')}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.employee')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.role')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.email')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEmployees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {employee.fullName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border border-green-300 bg-green-100 text-green-800">
                                                {t(`role.${employee.role}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {employee.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleRemove(employee.id)}
                                                disabled={loading && selectedEmployee === employee.id}
                                                className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-800 disabled:opacity-50 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <UserMinusIcon className="h-5 w-5 mr-1" />
                                                {loading && selectedEmployee === employee.id ? t('buttons.removing') : t('buttons.remove')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Enhanced Add Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full m-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-600 mx-auto">
                                {t('modal.title', { branchName })}
                            </h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Search bar for available employees */}
                        <div className="mb-6">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={t('search.availablePlaceholder')}
                                    className="w-full pl-10 pr-4 py-2 border outline-none rounded-lg focus:ring-2 focus:ring-primaryGreen focus:border-primaryGreen"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 text-primaryGreen" />
                            </div>
                        </div>
                        
                        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                            {filteredAvailableEmployees.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 font-medium">{t('modal.noResults.title')}</p>
                                    <p className="text-gray-400 text-sm mt-1">{t('modal.noResults.subtitle')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredAvailableEmployees.map((employee) => (
                                        <div
                                            key={employee.id}
                                            className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-primaryOrange group"
                                        >
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-primaryOrange/10 flex items-center justify-center">
                                                        <span className="text-primaryOrange font-semibold">
                                                            {employee.fullName.charAt(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900 group-hover:text-primaryOrange transition-colors">
                                                        {employee.fullName}
                                                    </h3>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                                                        {employee.role}
                                                    </span>
                                                    <p className="text-sm text-gray-600 mt-1">{employee.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAdd(employee.id)}
                                                disabled={loading && selectedEmployee === employee.id}
                                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primaryOrange hover:bg-primaryOrangeHover disabled:opacity-50 rounded-lg transition-colors"
                                            >
                                                {loading && selectedEmployee === employee.id ? (
                                                    <span className="flex items-center">
                                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center w-fit">
                                                        <UserPlusIcon className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                disabled={loading}
                            >
                                {t('buttons.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                }}
                onConfirm={confirmDelete}
                title={t('modal.removeTitle')}
                message={t('modal.confirmRemove')}
                confirmText={t('buttons.remove')}
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
}