import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function AssignEmployeesModal({ desk, employees, onClose, onAssign }) {
    const [selectedEmployees, setSelectedEmployees] = useState(
        desk.employees?.map(emp => emp.id) || []
    );
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEmployees = employees.filter(emp =>
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggleEmployee = (employeeId) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAssign(desk.id, selectedEmployees);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">
                        Assign Employees to {desk.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border rounded-md"
                    />
                </div>

                {/* Employee List */}
                <div className="flex-1 overflow-y-auto min-h-[300px]">
                    {filteredEmployees.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">
                            No employees found
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filteredEmployees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${selectedEmployees.includes(employee.id)
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                    onClick={() => handleToggleEmployee(employee.id)}
                                >
                                    <div className="flex-1">
                                        <h3 className="font-medium">{employee.fullName}</h3>
                                        <p className="text-sm text-gray-600">{employee.email}</p>
                                    </div>
                                    {selectedEmployees.includes(employee.id) && (
                                        <CheckIcon className="h-5 w-5 text-blue-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Save Assignments
                    </button>
                </div>
            </div>
        </div>
    );
}