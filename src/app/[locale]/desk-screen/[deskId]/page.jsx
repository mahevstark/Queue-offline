'use client';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function DeskScreen() {
    const t = useTranslations('deskScreen');
    const { deskId } = useParams();
    const [deskData, setDeskData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDeskData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/desks/${deskId}/screen`);
            const data = await response.json();

            if (data.success) {
                setDeskData(data.data);
                setError(null);
            } else {
                throw new Error(data.error || t('notifications.fetchError'));
            }
        } catch (err) {
            console.error('Error fetching desk data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeskData();

        const socket = io({ path: '/api/socketio' });

        socket.on('connect', () => {
            console.log(t('notifications.socketConnected'));
            socket.emit('joinDesk', deskId);
        });

        socket.on('deskUpdate', () => {
            console.log(t('notifications.socketUpdate'));
            fetchDeskData();
        });

        const interval = setInterval(fetchDeskData, 10000);

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [deskId]);

    function getEmployeeStatus(employee) {
        if (employee.isOnBreak) {
            return { 
                text: t('employeeStatus.onBreak.text'),
                color: 'bg-yellow-100 text-yellow-800',
                icon: t('employeeStatus.onBreak.icon')
            };
        }
        
        if (employee.isWorking) {
            return { 
                text: t('employeeStatus.active.text'),
                color: 'bg-green-100 text-green-800',
                icon: t('employeeStatus.active.icon')
            };
        }
        
        return { 
            text: t('employeeStatus.inactive.text'),
            color: 'bg-gray-100 text-gray-800',
            icon: t('employeeStatus.inactive.icon')
        };
    }

    if (loading && !deskData) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-pulse text-3xl font-bold text-primaryGreen">
                    {t('loading')}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-3xl font-bold text-red-600">
                    {t('error', { message: error })}
                </div>
            </div>
        );
    }

    const hasNoEmployees = !deskData?.employees || deskData.employees.length === 0;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="bg-primaryGreen shadow-lg rounded-lg mb-6 p-4">
                    <h1 className="text-3xl font-bold text-white text-center">
                        {deskData?.name}
                    </h1>
                </div>

                {hasNoEmployees ? (
                    <div className="bg-white shadow-lg rounded-lg p-8">
                        <div className="text-center">
                            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                {t('noEmployees.title')}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {t('noEmployees.description')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y text-center divide-gray-200">
                                <thead className="bg-primaryGreen">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                                            {t('table.headers.employee')}
                                        </th>
                                        <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                                            {t('table.headers.status')}
                                        </th>
                                        <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                                            {t('table.headers.currentToken')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {deskData?.employees.map((employee) => (
                                        <tr key={employee.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {employee.fullName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {employee.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {(() => {
                                                    const status = getEmployeeStatus(employee);
                                                    return (
                                                        <div className="flex items-center space-x-2 justify-center">
                                                            <span className={`px-3 py-1 inline-flex items-center text-sm leading-5 font-semibold rounded-full ${status.color}`}>
                                                                <span className="mr-1">{status.icon}</span>
                                                                {status.text}
                                                            </span>
                                                            {employee.isWorking && !employee.isOnBreak && (
                                                                <span className="flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {employee.currentToken ? (
                                                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-primaryGreen bg-opacity-10 text-primaryGreen">
                                                        <span className="text-lg font-semibold">
                                                            {employee.currentToken.displayNumber}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        {t('token.noActive')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-4 text-center text-sm text-gray-500">
                    {t('lastUpdated', { time: new Date().toLocaleTimeString() })}
                </div>
            </div>
        </div>
    );
}
