import { useState, useEffect } from 'react';
import {
    UserGroupIcon,
    ClockIcon,
    QueueListIcon
} from '@heroicons/react/24/outline';
import { branchService } from '@/services/branchService';

export default function DeskStatistics({ branchId, deskId }) {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatistics();
    }, [branchId, deskId, loadStatistics]);

    const loadStatistics = async () => {
        try {
            const data = await branchService.getDeskStatistics(branchId, deskId);
            setStatistics(data);
        } catch (error) {
            console.error('Error loading desk statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse">Loading statistics...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                    <UserGroupIcon className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                        <p className="text-sm text-gray-600">Active Employees</p>
                        <p className="text-2xl font-semibold">{statistics?.activeEmployees || 0}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                    <QueueListIcon className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                        <p className="text-sm text-gray-600">Tokens Processed Today</p>
                        <p className="text-2xl font-semibold">{statistics?.tokensProcessedToday || 0}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                    <ClockIcon className="h-8 w-8 text-yellow-500" />
                    <div className="ml-4">
                        <p className="text-sm text-gray-600">Avg. Service Time</p>
                        <p className="text-2xl font-semibold">
                            {statistics?.averageServiceTime
                                ? `${Math.round(statistics.averageServiceTime)} min`
                                : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}