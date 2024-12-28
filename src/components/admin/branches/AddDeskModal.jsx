import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function AddDeskModal({ onClose, onAdd }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        serviceTypes: [],
    });

    const serviceTypeOptions = [
        'CASH_DEPOSIT',
        'CASH_WITHDRAWAL',
        'ACCOUNT_OPENING',
        'LOAN_INQUIRY',
        'GENERAL_INQUIRY',
        'CARD_SERVICES',
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
    };

    const handleServiceTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            serviceTypes: prev.serviceTypes.includes(type)
                ? prev.serviceTypes.filter(t => t !== type)
                : [...prev.serviceTypes, type]
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Add New Desk</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Desk Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                name: e.target.value
                            }))}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                description: e.target.value
                            }))}
                            className="w-full px-3 py-2 border rounded-md"
                            rows="3"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Types
                        </label>
                        <div className="space-y-2">
                            {serviceTypeOptions.map((type) => (
                                <label key={type} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.serviceTypes.includes(type)}
                                        onChange={() => handleServiceTypeChange(type)}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">{type.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Add Desk
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}