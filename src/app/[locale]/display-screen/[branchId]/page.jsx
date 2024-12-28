// src/app/display-screen/[branchId]/page.jsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import { io } from 'socket.io-client';
import { useTranslations } from 'next-intl';
import { fetchDisplayTokens } from '@/lib/displayUtils';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function BranchDisplayScreen({ params }) {
    const t = useTranslations('displayBoard');
    const unwrappedParams = use(params);
    const branchId = parseInt(unwrappedParams.branchId);
    
    const [deskTokens, setDeskTokens] = useState({});
    const [loading, setLoading] = useState(true);

    const updateTokens = useCallback((data) => {
        if (!data || typeof data !== 'object') {
            console.error('Expected data to be an object, but received:', data);
            return;
        }

        if (data.branchId && data.branchId !== branchId) {
            return;
        }

        const { currentTokens = [], nextTokens = [] } = data;

        const branchCurrentTokens = currentTokens.filter(token => 
            token.branchId === branchId
        );
        const branchNextTokens = nextTokens.filter(token => 
            token.branchId === branchId
        );

        const allTokens = [...branchCurrentTokens, ...branchNextTokens];

        const updatedDeskTokens = allTokens.reduce((acc, token) => {
            const deskId = token.desk?.id || token.branchId;
            if (!deskId) return acc;
            
            if (!acc[deskId]) {
                acc[deskId] = {
                    deskName: token.desk?.name || t('desk.default', { number: deskId }),
                    tokens: []
                };
            }
            acc[deskId].tokens.push(token);
            return acc;
        }, {});

        setDeskTokens(updatedDeskTokens);
    }, [branchId, t]);

    useEffect(() => {
        const socket = io('/', {
            path: '/api/socketio',
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('Display connected to branch:', branchId);
            socket.emit('joinBranch', branchId);
        });

        socket.on('connect_error', () => {
            toast.error(t('notifications.connectionError'));
        });

        socket.on('tokenUpdate', updateTokens);

        const fetchInitialData = async () => {
            try {
                const data = await fetchDisplayTokens(branchId);
                updateTokens({ ...data, branchId });
            } catch (error) {
                toast.error(t('notifications.loadError'));
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
        const pollInterval = setInterval(fetchInitialData, 5000);

        return () => {
            clearInterval(pollInterval);
            socket.disconnect();
        };
    }, [branchId, updateTokens, t]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-pulse text-3xl font-bold text-primaryGreen flex items-center gap-2">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    {t('loading')}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-primaryGreen text-white py-4 px-6 shadow-lg">
                <h1 className="text-5xl font-bold text-center">{t('title')}</h1>
                <p className="text-center text-xl mt-2 text-blue-100">
                    {t('subtitle')}
                </p>
            </div>

            <div className="container mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {Object.entries(deskTokens).map(([deskId, { deskName, tokens }]) => (
                        <div key={deskId} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-primaryGreen p-4">
                                <h2 className="text-3xl font-bold text-center text-white">
                                    {deskName}
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {tokens.map((token) => (
                                    <div
                                        key={token.id}
                                        className={`p-4 rounded-lg transition-colors duration-300 ${
                                            token.status === 'SERVING'
                                                ? 'bg-green-900 border-l-4 border-green-500'
                                                : 'bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex flex-col justify-between items-center">
                                            <span className="text-3xl font-bold text-white">
                                                {token.displayNumber}
                                            </span>
                                            <span className={`px-3 py-1 ml-2 w-fit rounded-full text-sm ${
                                                token.status === 'SERVING'
                                                    ? 'bg-green-500'
                                                    : 'bg-blue-500'
                                            } text-white`}>
                                                {t(`token.status.${token.status}`)}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm text-white">
                                            <p className="font-semibold">{token.service?.name}</p>
                                            <p>{token.subService?.name}</p>
                                            {token.assignedTo && (
                                                <p className="mt-1 font-medium">
                                                    Employee: {token.assignedTo?.fullName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {tokens.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">
                                        {t('desk.noTokens')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-primaryGreen p-2 text-center">
                <p className="text-lg text-white">{t('footer')}</p>
            </div>
        </div>
    );
}