import { useState } from 'react';
import {
    UserGroupIcon,
    PencilIcon,
    TrashIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import DeskStatistics from './DeskStatistics';

export default function DeskDetails({
    desk,
    branchId,
    onEdit,
    onDelete,
    onAssignEmployees
}) {
    const [showStats, setShowStats] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold">{desk.name}</h3>
                    <p className="text-gray-600 text-sm">{desk.description}</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowStats(!showStats)}
                        className="p-2 text-gray-600 hover:text-gray-800"
                        title="View Statistics"
                    >
                        <ChartBarIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onAssignEmployees(desk)}
                        className="p-2 text-blue-600 hover:text-blue-800"
                        title="Assign Employees"
                    >
                        <UserGroupIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onEdit(desk)}
                        className="p-2 text-gray-600 hover:text-gray-800"
                        title="Edit Desk"
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onDelete(desk.id)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Delete Desk"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {showStats && (
                <div className="mt-4">
                    <DeskStatistics branchId={branchId} deskId={desk.id} />
                </div>
            )}

            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Service Types
                </h4>
                <div className="flex flex-wrap gap-2">
                    {desk.serviceTypes.map((type) => (
                        <span
                            key={type}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                            {type.replace('_', ' ')}
                        </span>
                    ))}
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
                                <span className="text-xs text-gray-500">{employee.email}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No employees assigned</p>
                )}
            </div>
        </div>
    );
}