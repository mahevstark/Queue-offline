'use client'
import { useState, useEffect, use } from 'react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { useTranslations } from 'next-intl';
import Calendar from '@/components/ui/calender';
import { toast } from 'react-hot-toast';
import {
    CalendarIcon,
    FunnelIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import userService from '@/services/userService';

const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
        date: format(date, 'MMM dd, yyyy'), // Dec 09, 2023
        time: format(date, 'hh:mm a')       // 10:44 AM
    };
};

const formatDuration = (minutes) => {
    if (!minutes || minutes < 0) return '0m';
    if (minutes < 60) {
        return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const UserLogs = ({ params }) => {
    const t = useTranslations('userLogs');
    const unwrappedParams = use(params);
    const userId = unwrappedParams.id;
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        dateRange: 'today', // today, yesterday, thisWeek, thisMonth, custom
        startDate: new Date(),
        endDate: new Date(),
        logType: 'all', // all, WORK_START, WORK_END, BREAK_START, BREAK_END
        sortBy: 'newest' // newest, oldest
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [summary, setSummary] = useState({
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        breakCount: 0,
        tokensCompleted: 0,  // Add this field
        currentStatus: 'OFFLINE' // Can be 'WORKING', 'BREAK', 'OFFLINE'
    });

    // Filter options
    const dateRangeOptions = [
        { value: 'today', label: t('filters.dateRange.options.today') },
        { value: 'yesterday', label: t('filters.dateRange.options.yesterday') },
        { value: 'thisWeek', label: t('filters.dateRange.options.lastWeek') },
        { value: 'thisMonth', label: t('filters.dateRange.options.lastMonth') },
        { value: 'custom', label: t('filters.dateRange.options.custom') }
    ];

    const logTypeOptions = [
        { value: 'all', label: t('filters.activityType.options.all') },
        { value: 'WORK_START', label: t('filters.activityType.options.SHIFT_START') },
        { value: 'WORK_END', label: t('filters.activityType.options.SHIFT_END') },
        { value: 'BREAK_START', label: t('filters.activityType.options.BREAK_START') },
        { value: 'BREAK_END', label: t('filters.activityType.options.BREAK_END') }
    ];

    const handleDateRangeChange = (range) => {
        const today = new Date();
        let startDate = today;
        let endDate = today;

        switch (range) {
            case 'yesterday':
                startDate = subDays(today, 1);
                endDate = subDays(today, 1);
                break;
            case 'thisWeek':
                startDate = subDays(today, today.getDay());
                endDate = today;
                break;
            case 'thisMonth':
                startDate = startOfMonth(today);
                endDate = endOfMonth(today);
                break;
            case 'custom':
                // Keep existing dates for custom range
                startDate = filters.startDate;
                endDate = filters.endDate;
                setShowDatePicker(true);
                break;
            default: // today
                break;
        }

        setFilters(prev => ({
            ...prev,
            dateRange: range,
            startDate,
            endDate
        }));
    };

    const handleCustomDateChange = (dates) => {
        if (dates?.from && dates?.to) {
            setFilters(prev => ({
                ...prev,
                startDate: dates.from,
                endDate: dates.to
            }));
        }
    };

    const fetchLogs = async () => {
        if (!userId) {
            console.warn('No userId provided');
            return;
        }
        
        try {
            setLoading(true);
            let startDateStr, endDateStr;

            // Format dates based on the selected date range
            if (filters.dateRange === 'custom') {
                startDateStr = format(filters.startDate, 'yyyy-MM-dd');
                endDateStr = format(filters.endDate, 'yyyy-MM-dd');
            } else {
                // For single day selection
                startDateStr = format(filters.startDate, 'yyyy-MM-dd');
                endDateStr = format(filters.startDate, 'yyyy-MM-dd');
            }


            const result = await userService.getUserLogs(userId, { 
                startDate: startDateStr,
                endDate: endDateStr,
                logType: filters.logType
            });

            if (result && result.logs) {
                let filteredLogs = result.logs.filter(log => {
                    const logDate = new Date(log.startTime);
                    const start = new Date(startDateStr);
                    const end = new Date(endDateStr);
                    end.setHours(23, 59, 59, 999); // Include the entire end day

                    return logDate >= start && logDate <= end;
                });

                // Apply log type filter if not 'all'
                if (filters.logType !== 'all') {
                    filteredLogs = filteredLogs.filter(log => log.logType === filters.logType);
                }

                // Apply sorting
                filteredLogs.sort((a, b) => {
                    const dateA = new Date(a.startTime);
                    const dateB = new Date(b.startTime);
                    return filters.sortBy === 'newest' 
                        ? dateB - dateA 
                        : dateA - dateB;
                });

                setLogs(filteredLogs);
                setSummary(calculateSummary(filteredLogs));
            } else {
                console.warn('Invalid response format:', result);
                setLogs([]);
                resetSummary();
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Failed to fetch logs');
            setLogs([]);
            resetSummary();
        } finally {
            setLoading(false);
        }
    };

    const resetSummary = () => {
        setSummary({
            totalWorkMinutes: 0,
            totalBreakMinutes: 0,
            breakCount: 0,
            tokensCompleted: 0,
            currentStatus: 'OFFLINE'
        });
    };

    // Calculate summary based on filtered logs
    const calculateSummary = (logs) => {
        let summary = {
            totalWorkMinutes: 0,
            totalBreakMinutes: 0,
            breakCount: 0,
            tokensCompleted: 0,
            currentStatus: 'OFFLINE'
        };

        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch tokens completed for the date range
        const fetchTokensCompleted = async () => {
            try {
                const startDateStr = format(filters.startDate, 'yyyy-MM-dd');
                const endDateStr = format(filters.endDate, 'yyyy-MM-dd');
                
                const response = await fetch(`/api/users/${userId}/tokens/completed?startDate=${startDateStr}&endDate=${endDateStr}`);
                const data = await response.json();
                if (data.success) {
                    summary.tokensCompleted = data.count;
                    setSummary(prev => ({ ...prev, tokensCompleted: data.count }));
                }
            } catch (error) {
                console.error('Error fetching completed tokens:', error);
            }
        };

        let lastWorkStart = null;
        let lastBreakStart = null;
        let isCurrentlyWorking = false;
        let isCurrentlyOnBreak = false;

        // Sort logs by time
        const sortedLogs = [...logs].sort((a, b) => 
            new Date(a.startTime) - new Date(b.startTime)
        );

        sortedLogs.forEach(log => {
            const time = new Date(log.startTime);
            
            switch (log.logType) {
                case 'WORK_START':
                    lastWorkStart = time;
                    isCurrentlyWorking = true;
                    isCurrentlyOnBreak = false;
                    break;

                case 'WORK_END':
                    if (lastWorkStart) {
                        const duration = Math.round((time - lastWorkStart) / (1000 * 60));
                        summary.totalWorkMinutes += duration > 0 ? duration : 0;
                        lastWorkStart = null;
                    }
                    isCurrentlyWorking = false;
                    break;

                case 'BREAK_START':
                    if (lastWorkStart) {
                        const workDuration = Math.round((time - lastWorkStart) / (1000 * 60));
                        summary.totalWorkMinutes += workDuration > 0 ? workDuration : 0;
                        lastWorkStart = null;
                    }
                    lastBreakStart = time;
                    summary.breakCount++;
                    isCurrentlyOnBreak = true;
                    break;

                case 'BREAK_END':
                    if (lastBreakStart) {
                        const duration = Math.round((time - lastBreakStart) / (1000 * 60));
                        summary.totalBreakMinutes += duration > 0 ? duration : 0;
                        lastBreakStart = null;
                    }
                    lastWorkStart = time;
                    isCurrentlyOnBreak = false;
                    isCurrentlyWorking = true;
                    break;
            }
        });

        // Handle ongoing sessions
        const now = new Date();
        if (isCurrentlyWorking && lastWorkStart) {
            const duration = Math.round((now - lastWorkStart) / (1000 * 60));
            summary.totalWorkMinutes += duration > 0 ? duration : 0;
            summary.currentStatus = 'WORKING';
        } else if (isCurrentlyOnBreak && lastBreakStart) {
            const duration = Math.round((now - lastBreakStart) / (1000 * 60));
            summary.totalBreakMinutes += duration > 0 ? duration : 0;
            summary.currentStatus = 'BREAK';
        }

        // Format the times
        summary.formattedWorkTime = formatDuration(summary.totalWorkMinutes);
        summary.formattedBreakTime = formatDuration(summary.totalBreakMinutes);

        // Call fetchTokensCompleted
        fetchTokensCompleted();

        return summary;
    };

    // Update useEffect to trigger on all filter changes
    useEffect(() => {
        if (userId) {
            fetchLogs();
            const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [filters.startDate, filters.endDate, filters.logType, filters.sortBy, userId]);

    const getLogTypeDisplay = (logType) => {
        const types = {
            'WORK_START': {
                text: 'Started Work',
                bgColor: 'bg-green-100',
                textColor: 'text-green-800'
            },
            'WORK_END': {
                text: 'Ended Work',
                bgColor: 'bg-red-100',
                textColor: 'text-red-800'
            },
            'BREAK_START': {
                text: 'Started Break',
                bgColor: 'bg-yellow-100',
                textColor: 'text-yellow-800'
            },
            'BREAK_END': {
                text: 'Ended Break',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-800'
            }
        };
        return types[logType] || {
            text: logType,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-800'
        };
    };

    // Add this helper function for status display
    const getStatusDisplay = (status) => {
        const statusConfig = {
            'WORKING': {
                text: 'Currently Working',
                bgColor: 'bg-green-100',
                textColor: 'text-green-800',
                icon: '🏢'
            },
            'BREAK': {
                text: 'On Break',
                bgColor: 'bg-yellow-100',
                textColor: 'text-yellow-800',
                icon: '☕'
            },
            'OFFLINE': {
                text: 'Offline',
                bgColor: 'bg-gray-100',
                textColor: 'text-gray-800',
                icon: '🏡'
            }
        };
        return statusConfig[status] || statusConfig['OFFLINE'];
    };

    // Add this function to handle sort order toggle
    const toggleSortOrder = () => {
        setFilters(prev => ({
            ...prev,
            sortBy: prev.sortBy === 'newest' ? 'oldest' : 'newest'
        }));
    };

    // Add this function to handle log type changes
    const handleLogTypeChange = (value) => {
        setFilters(prev => ({
            ...prev,
            logType: value
        }));
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-6">
                {/* Filters Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {t('title')}
                    </h2>

                    <div className="flex flex-wrap gap-4">
                        {/* Date Range Filter */}
                        <div className="relative">
                            <select
                                value={filters.dateRange}
                                onChange={(e) => handleDateRangeChange(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primaryGreen focus:border-transparent"
                            >
                                {dateRangeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Activity Type Filter */}
                        <div className="relative">
                            <select
                                value={filters.logType}
                                onChange={(e) => handleLogTypeChange(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primaryGreen focus:border-transparent"
                            >
                                {logTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Order */}
                        <button
                            onClick={toggleSortOrder}
                            className="inline-flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                        >
                            <span>{filters.sortBy === 'newest' ? t('filters.sortOrder.newest') : t('filters.sortOrder.oldest')}</span>
                            {filters.sortBy === 'newest' ? <ArrowDownIcon className="h-4 w-4" /> : <ArrowUpIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-green-800">{t('summary.workTime.title')}</h3>
                        <p className="text-2xl font-bold text-green-600">
                            {summary.formattedWorkTime || t('summary.workTime.empty')}
                        </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-yellow-800">{t('summary.breakTime.title')}</h3>
                        <p className="text-2xl font-bold text-yellow-600">
                            {summary.formattedBreakTime || t('summary.breakTime.empty')}
                        </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800">{t('summary.breakCount.title')}</h3>
                        <p className="text-2xl font-bold text-blue-600">
                            {summary.breakCount || t('summary.breakCount.empty')}
                        </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-purple-800">{t('summary.tokensCompleted.title')}</h3>
                        <p className="text-2xl font-bold text-purple-600">
                            {summary.tokensCompleted || t('summary.tokensCompleted.empty')}
                        </p>
                    </div>
                    <div className={`${getStatusDisplay(summary.currentStatus).bgColor} p-4 rounded-lg`}>
                        <h3 className={`text-sm font-medium ${getStatusDisplay(summary.currentStatus).textColor}`}>
                            {t('summary.currentStatus.title')}
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl">
                                {getStatusDisplay(summary.currentStatus).icon}
                            </span>
                            <p className={`text-xl font-bold ${getStatusDisplay(summary.currentStatus).textColor}`}>
                                {t(`summary.currentStatus.states.${summary.currentStatus}`)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-2 text-gray-600">{t('table.loading')}</p>
                        </div>
                    ) : logs.length > 0 ? (
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.date')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.time')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('table.headers.activity')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log) => {
                                    const logType = getLogTypeDisplay(log.logType);
                                    const datetime = formatDateTime(log.startTime);
                                    
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {datetime.date}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {datetime.time}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${logType.bgColor} ${logType.textColor}`}>
                                                    {t(`filters.activityType.options.${log.logType}`)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">{t('table.empty')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserLogs;