import { useState, useEffect, useCallback } from 'react';
import userService from '@/services/userService';
import deskService from '@/services/deskService';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AssignEmployeesDialog({ open, onClose, desk, branchId, onAssign }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const data = await userService.getUsers({ branchId });
            setEmployees(data);
        } catch (error) {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (open && desk) {
            loadEmployees();
            setSelectedEmployees(desk.employees?.map(emp => emp.id) || []);
        }
    }, [open, desk, branchId, loadEmployees]);

    const handleSubmit = async () => {
        try {
            await deskService.assignEmployees(branchId, desk.id, selectedEmployees);
            toast.success('Employees assigned successfully');
            onAssign();
            onClose();
        } catch (error) {
            toast.error('Failed to assign employees');
        }
    };

    if (!open) return null;
    if (loading) return <LoadingSpinner />;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Assign Employees to Desk</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                    {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2 py-2">
                            <input
                                type="checkbox"
                                id={`employee-${employee.id}`}
                                checked={selectedEmployees.includes(employee.id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedEmployees([...selectedEmployees, employee.id]);
                                    } else {
                                        setSelectedEmployees(selectedEmployees.filter(id => id !== employee.id));
                                    }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                                htmlFor={`employee-${employee.id}`}
                                className="text-sm font-medium text-gray-700"
                            >
                                {employee.fullName}
                            </label>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="rounded-md px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}