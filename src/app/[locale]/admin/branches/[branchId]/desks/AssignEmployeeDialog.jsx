import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useTranslations } from 'next-intl';

export default function AssignEmployeesDialog({ open, onClose, desk, branchEmployees, onAssign }) {
    const t = useTranslations('assignEmployees');
    const [selectedEmployees, setSelectedEmployees] = useState([]);

    useEffect(() => {
        if (open && desk) {
            const currentEmployeeIds = desk.employees?.map(emp => emp.id) || [];
            setSelectedEmployees(currentEmployeeIds);
        }
    }, [open, desk]);

    const handleEmployeeToggle = (employeeId) => {
        setSelectedEmployees(prev => {
            if (prev.includes(employeeId)) {
                return prev.filter(id => id !== employeeId);
            } else {
                return [...prev, employeeId];
            }
        });
    };

    const handleAssign = async () => {
        const success = await onAssign(selectedEmployees);
        if (success) {
            onClose();
        }
    };

    // Filter employees who are:
    // 1. Have the role 'EMPLOYEE'
    // 2. Either not assigned to any desk OR assigned to the current desk
    const availableEmployees = branchEmployees.filter(employee => 
        employee.role === 'EMPLOYEE' && 
        (!employee.assignedDeskId || employee.assignedDeskId === null)
    );
    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            className="bg-white rounded-lg shadow-lg p-4 border border-gray-100"
            title={t('title')}
        >
            <div className="space-y-4">
                {availableEmployees.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">
                        {t('noEmployees')}
                    </p>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                        {availableEmployees.map((employee) => (
                            <div
                                key={employee.id}
                                className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
                            >
                                <input
                                    type="checkbox"
                                    id={`employee-${employee.id}`}
                                    checked={selectedEmployees.includes(employee.id)}
                                    onChange={() => handleEmployeeToggle(employee.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label
                                    htmlFor={`employee-${employee.id}`}
                                    className="flex-1 cursor-pointer"
                                >
                                    <div className="font-medium text-gray-900">{employee.fullName}</div>
                                    <div className="text-sm text-gray-500">{employee.email}</div>
                                </label>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end space-x-2 pt-4 mt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {t('buttons.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={availableEmployees.length === 0 || selectedEmployees.length === 0}
                        className={`inline-flex justify-center rounded-md border border-transparent ${
                            availableEmployees.length === 0 || selectedEmployees.length === 0   
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-primaryOrange hover:bg-primaryOrangeHover'
                        } px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primaryOrange focus:ring-offset-2`}
                    >
                        {t('buttons.assign')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
