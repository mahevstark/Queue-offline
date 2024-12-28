import { useState } from 'react';
import {
    UserGroupIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import AssignEmployeesModal from './AssignEmployeesModal';

export default function DeskList({
    desks,
    employees,
    onDeleteDesk,
    onUpdateDesk
}) {
    const [selectedDesk, setSelectedDesk] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const handleAssignEmployees = (deskId, employeeIds) => {
        onUpdateDesk(deskId, { employeeIds });
        setShowAssignModal(false);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {desks.map((desk) => (
                <div
                    key={desk.id}
                    className="bg-white rounded-lg shadow-md p-6"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">{desk.name}</h3>
                            <p className="text-gray-600 text-sm">{desk.description}</p>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setSelectedDesk(desk);
                                    setShowAssignModal(true);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-800"
                                title="Assign Employees"
                            >
                                <UserGroupIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => onDeleteDesk(desk.id)}
                                className="p-2 text-red-600 hover:text-red-800"
                                title="Delete Desk"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Assigned Employees ({desk.employees?.length || 0})
                        </h4>
                        {desk.employees?.length > 0 ? (
                            <div className="space-y-2">
                                {desk.employees.map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                                    >
                                        <span className="text-sm">{employee.fullName}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No employees assigned</p>
                        )}
                    </div>
                </div>
            ))}

            {showAssignModal && selectedDesk && (
                <AssignEmployeesModal
                    desk={selectedDesk}
                    employees={employees}
                    onClose={() => setShowAssignModal(false)}
                    onAssign={handleAssignEmployees}
                />
            )}
        </div>
    );
}