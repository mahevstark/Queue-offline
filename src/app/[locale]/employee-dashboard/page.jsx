'use client'
import { useState, useEffect } from 'react';
import { Dialog } from "@headlessui/react";
import { toast } from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { io } from 'socket.io-client';
import { useUser } from '@/context/UserContext';
import userService from '@/services/userService';
import { getAuthToken } from '@/lib/authService';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { PlayIcon, StopIcon, PauseIcon } from '@heroicons/react/24/outline';

// Add confirmation dialog component
const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
    const t = useTranslations('employeeDashboard');
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6">
                    <div className="flex items-center gap-4">
                        <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
                        <Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
                    </div>
                    
                    <Dialog.Description className="mt-3 text-gray-600">
                        {message}
                    </Dialog.Description>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                            onClick={onClose}
                        >
                            {t('dialog.cancel')}
                        </button>
                        <button
                            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
                            onClick={onConfirm}
                        >
                            {t('dialog.confirm')}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

const WorkActionButtons = ({ isWorking, isOnBreak, onStartWork, onEndWork, onStartBreak, onEndBreak }) => {
    const t = useTranslations('employeeDashboard.actions');
    return (
        <div className="flex space-x-4">
            {/* Initial State: Only Show Start Work */}
            {!isWorking && !isOnBreak && (
                <button
                    onClick={() => onStartWork()}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
                >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    {t('startWork')}
                </button>
            )}

            {/* Working State: Show End Work and Start Break */}
            {isWorking && !isOnBreak && (
                <>
                    <button
                        onClick={() => onEndWork()}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center"
                    >
                        <StopIcon className="h-5 w-5 mr-2" />
                        {t('endWork')}
                    </button>
                    <button
                        onClick={() => onStartBreak()}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center"
                    >
                        <PauseIcon className="h-5 w-5 mr-2" />
                        {t('startBreak')}
                    </button>
                </>
            )}

            {/* Break State: Only Show End Break */}
            {isWorking && isOnBreak && (
                <button
                    onClick={() => onEndBreak()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    {t('endBreak')}
                </button>
            )}
        </div>
    );
};

export default function EmployeeDashboard() {
    const t = useTranslations('employeeDashboard');
    const { user, isLoading, error, setUser } = useUser();
    const [currentToken, setCurrentToken] = useState(null);
    const [nextToken, setNextToken] = useState(null);
    const [stats, setStats] = useState({ tokensCompleted: 0, tokensInQueue: 0 });
    const [loading, setLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [notification, setNotification] = useState("");
    const [socket, setSocket] = useState(null);
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        title: '',
        description: '',
        action: null,
        confirmButtonText: '',
        confirmButtonColor: '',
    });

    // Add confirmation states and handlers
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        action: null
    });

    const showConfirmation = (title, message, action) => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            action
        });
    };

    const handleConfirm = async () => {
        if (confirmDialog.action) {
            await confirmDialog.action();
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        if (isLoading) return;
        if (!user?.assignedDeskId) {
            setLoading(false);
            return;
        }

        const socketIo = io({
            path: '/api/socketio'
        });

        socketIo.on('connect', () => {
            console.log('Connected to socket server');
            loadEmployeeTokens();
        });

        socketIo.on('tokenUpdate', (data) => {
            loadEmployeeTokens();
        });

        setSocket(socketIo);
        
        // Set initial work states based on user data
        setIsWorking(user.isWorking || false);
        setIsOnBreak(user.isOnBreak || false);

        // Initial load
        loadEmployeeTokens();
        
        return () => {
            socketIo.disconnect();
        };
    }, [user, isLoading]);

    const loadEmployeeTokens = async () => {
        if (!user?.assignedDeskId) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/users/${user.id}/tokens`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load tokens');
            }

            setCurrentToken(data.currentToken);
            setNextToken(data.nextToken);
            setStats(data.stats);
        } catch (error) {
            console.error('Error loading tokens:', error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNextToken = async () => {
        if (!user?.id) {
            toast.error(t('messages.error.userNotFound'));
            return;
        }

        try {
            // If there's a current token, complete it first
            if (currentToken) {
                await handleCompleteToken();
            }
            
            const response = await fetch(`/api/users/${user.id}/serve-next`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const responseText = await response.text();
            let data;
            
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                throw new Error(t('messages.error.failedToServe'));
            }

            if (!response.ok) {
                throw new Error(data.error || t('messages.error.failedToServe'));
            }

            if (data.success) {
                toast.success(t('messages.success.nextToken'));
                await loadEmployeeTokens();
            } else {
                throw new Error(data.error || t('messages.error.failedToServe'));
            }
        } catch (error) {
            console.error('Detailed error:', error);
            toast.error(error.message || t('messages.error.failedToServe'));
        }
    };

    const handleCompleteToken = async () => {
        if (!currentToken?.id) return;

        try {
            const response = await fetch(`/api/tokens/${currentToken.id}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ 
                    userId: user.id,
                    deskId: user.assignedDeskId 
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Server error:', data);
                throw new Error(data.error || 'Failed to complete token');
            }

            toast.success('Token completed successfully');
            setCurrentToken(null);
            await loadEmployeeTokens();
        } catch (error) {
            console.error('Error completing token:', error);
            toast.error(error.message);
        }
    };

    const handleStartWork = async () => {
        try {
            const now = new Date();
            const logData = {
                logType: 'WORK_START',
                startTime: now.toISOString(),
                date: now.toISOString()
            };
            
            const newLog = await userService.createUserLog(user.id, logData);
            
            if (newLog && newLog.id) {
                setIsWorking(true);
                setIsOnBreak(false);
                toast.success("Work started successfully");
                
                if (newLog.user) {
                    setUser(prevUser => ({
                        ...prevUser,
                        isWorking: true,
                        isOnBreak: false
                    }));
                }
            }
        } catch (error) {
            console.error('Error starting work:', error);
            toast.error(error.message || "Failed to start work");
        }
    };

    const handleEndWork = async () => {
        try {
            const now = new Date();
            const logData = {
                logType: 'WORK_END',
                startTime: now.toISOString(),
                date: now.toISOString()
            };
            
            const newLog = await userService.createUserLog(user.id, logData);
            
            if (newLog && newLog.id) {
                setIsWorking(false);
                setIsOnBreak(false);
                toast.success("Work ended successfully");
                
                if (newLog.user) {
                    setUser(prevUser => ({
                        ...prevUser,
                        isWorking: false,
                        isOnBreak: false
                    }));
                }
            }
        } catch (error) {
            console.error('Error ending work:', error);
            toast.error(error.message || "Failed to end work");
        }
    };

    const handleStartBreak = async () => {
        try {
            const now = new Date();
            const logData = {
                logType: 'BREAK_START',
                startTime: now.toISOString(),
                date: now.toISOString()
            };
            
            const newLog = await userService.createUserLog(user.id, logData);
            
            if (newLog && newLog.id) {
                setIsOnBreak(true);
                toast.success("Break started successfully");
                
                if (newLog.user) {
                    setUser(prevUser => ({
                        ...prevUser,
                        isOnBreak: true
                    }));
                }
            }
        } catch (error) {
            console.error('Error starting break:', error);
            toast.error(error.message || "Failed to start break");
        }
    };

    const handleEndBreak = async () => {
        try {
            const now = new Date();
            const logData = {
                logType: 'BREAK_END',
                startTime: now.toISOString(),
                date: now.toISOString()
            };
            
            const newLog = await userService.createUserLog(user.id, logData);
            
            if (newLog && newLog.id) {
                setIsOnBreak(false);
                toast.success("Break ended successfully");
                
                if (newLog.user) {
                    setUser(prevUser => ({
                        ...prevUser,
                        isOnBreak: false
                    }));
                }
            }
        } catch (error) {
            console.error('Error ending break:', error);
            toast.error(error.message || "Failed to end break");
        }
    };

    const showConfirmDialog = (config) => {
        setDialogConfig({
            isOpen: true,
            ...config
        });
    };

    const confirmStartWork = () => {
        showConfirmDialog({
            title: t('confirmations.startWork.title'),
            description: t('confirmations.startWork.message'),
            action: handleStartWork,
            confirmButtonText: t('actions.startWork'),
            confirmButtonColor: 'blue'
        });
    };

    const confirmEndWork = () => {
        showConfirmDialog({
            title: t('confirmations.endWork.title'),
            description: t('confirmations.endWork.message'),
            action: handleEndWork,
            confirmButtonText: t('actions.endWork'),
            confirmButtonColor: 'red'
        });
    };

    const confirmStartBreak = () => {
        showConfirmDialog({
            title: t('confirmations.startBreak.title'),
            description: t('confirmations.startBreak.message'),
            action: handleStartBreak,
            confirmButtonText: t('actions.startBreak'),
            confirmButtonColor: 'green'
        });
    };

    const confirmEndBreak = () => {
        showConfirmDialog({
            title: t('confirmations.endBreak.title'),
            description: t('confirmations.endBreak.message'),
            action: handleEndBreak,
            confirmButtonText: t('actions.endBreak'),
            confirmButtonColor: 'green'
        });
    };

    // Add this helper function to handle button states
    const getButtonStates = () => {
        return {
            canStartWork: !isWorking && !isOnBreak,
            canEndWork: isWorking && !isOnBreak,
            canStartBreak: isWorking && !isOnBreak,
            canEndBreak: isOnBreak
        };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl font-semibold text-gray-600">{t('loading')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl font-semibold text-red-600">{t('error', { error })}</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-2xl font-semibold text-yellow-600">{t('loginPrompt')}</div>
            </div>
        );
    }

    const buttonStates = getButtonStates();

    return (
        <div className="min-h-screen bg-white p-6">
            {/* Notification Section */}
            {notification && (
                <div className="max-w-7xl mx-auto mb-6">
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
                        <p>{notification}</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Employee Info */}
                <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('welcome', { name: user?.fullName })}
                    </h1>
                    <div className="text-gray-600">
                        <p>{t('info.desk', { name: user?.assignedDesk?.name || t('info.notAssigned') })}</p>
                        <p>{t('info.branch', { name: user?.branch?.name || t('info.notAssigned') })}</p>
                        <p>{t('info.status.label', { 
                            status: user?.isWorking 
                                ? (user?.isOnBreak ? t('info.status.onBreak') : t('info.status.working')) 
                                : t('info.status.notWorking') 
                        })}</p>
                    </div>
                </div>

                {/* Show warning if no desk assigned */}
                {!user?.assignedDeskId && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4">
                        <p>{t('warnings.noDesk')}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Current Token */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('stats.currentToken.title')}</h2>
                        {currentToken ? (
                            <div className="space-y-2">
                                <p className="text-3xl font-bold text-blue-600">{currentToken.displayNumber}</p>
                                <p className="text-sm text-gray-600">{currentToken.service?.name}</p>
                                <p className="text-sm text-gray-600">{currentToken.subService?.name}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('stats.currentToken.empty')}</p>
                        )}
                    </div>

                    {/* Next Token */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('stats.nextToken.title')}</h2>
                        {nextToken ? (
                            <div className="space-y-2">
                                <p className="text-3xl font-bold text-green-600">{nextToken.displayNumber}</p>
                                <p className="text-sm text-gray-600">{nextToken.service?.name}</p>
                                <p className="text-sm text-gray-600">{nextToken.subService?.name}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('stats.nextToken.empty')}</p>
                        )}
                    </div>

                    {/* Tokens in Queue */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('stats.queueLength.title')}</h2>
                        <p className="text-3xl font-bold text-purple-600">{stats.tokensInQueue}</p>
                    </div>

                    {/* Completed Today */}
                    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('stats.completedToday.title')}</h2>
                        <p className="text-3xl font-bold text-orange-600">{stats.tokensCompleted}</p>
                    </div>
                </div>

                {/* Work Control Buttons */}
                <WorkActionButtons
                    isWorking={isWorking}
                    isOnBreak={isOnBreak}
                    onStartWork={confirmStartWork}
                    onEndWork={confirmEndWork}
                    onStartBreak={confirmStartBreak}
                    onEndBreak={confirmEndBreak}
                />

                {/* Token Control Buttons */}
                {isWorking && !isOnBreak && (
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={handleNextToken}
                            disabled={!isWorking || isOnBreak || (!currentToken && stats.tokensInQueue === 0)}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {currentToken 
                                ? (stats.tokensInQueue > 0 ? t('actions.completeAndNext') : t('actions.completeToken'))
                                : t('actions.nextToken')
                            }
                        </button>
                    </div>
                )}

                {/* Break Message */}
                {isOnBreak && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-center font-medium">
                            {t('messages.onBreak')}
                        </p>
                    </div>
                )}
            </div>

            {/* Confirmation Dialogs */}
            <Dialog
                open={dialogConfig.isOpen}
                onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                className="fixed inset-0 flex items-center z-[9999] justify-center bg-black bg-opacity-50"
            >
                <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
                    <Dialog.Title className="text-xl font-bold text-gray-800">
                        {dialogConfig.title}
                    </Dialog.Title>
                    <Dialog.Description className="text-gray-600 mt-2">
                        {dialogConfig.description}
                    </Dialog.Description>
                    <div className="mt-4 flex justify-end space-x-4">
                        <button
                            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            onClick={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
                        >
                            {t('dialog.cancel')}
                        </button>
                        <button
                            className={`px-4 py-2 bg-${dialogConfig.confirmButtonColor}-600 text-white rounded hover:bg-${dialogConfig.confirmButtonColor}-700`}
                            onClick={() => {
                                setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                dialogConfig.action();
                            }}
                        >
                            {dialogConfig.confirmButtonText}
                        </button>
                    </div>
                </div>
            </Dialog>

            <ConfirmationDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
            />
        </div>
    );
}