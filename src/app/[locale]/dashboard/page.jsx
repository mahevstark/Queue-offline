"use client";
import { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  Title
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  Title
);
import { useTranslations } from 'next-intl';


export default function Page() {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState({
    todayGathering: { value: 0, percentage: '0' },
    pendingAppointments: { value: 0, percentage: '0' },
    dailyAverage: { value: 0, percentage: '0' },
    averageWaitingTime: 'N/A',
    chartData: {
      lineChart: {
        labels: [],
        data: []
      },
      doughnutChart: {
        labels: [],
        data: []
      },
      tokenStatusChart: {
        labels: [t('charts.tokenStatusDistribution.labels.COMPLETED'), t('charts.tokenStatusDistribution.labels.PENDING'), t('charts.tokenStatusDistribution.labels.SERVING')],
        data: [0, 0, 0]
      }
    },
    branchStats: {
      pendingTokens: 0,
      activeDesks: 0,
      totalEmployees: 0,
      onlineWorkers: 0,
      workersOnBreak: 0,
      activeNumerators: 0,
      totalNumerators: 0
    },
    busyHoursData: {
      weekly: Array(24).fill(0),
      monthly: Array(24).fill(0),
      yearly: Array(24).fill(0)
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeeLogs, setEmployeeLogs] = useState([]);
  const [busyHoursTimeframe, setBusyHoursTimeframe] = useState('weekly');
  const [searchQuery, setSearchQuery] = useState('');


// Add this helper function at the top level
const getLogTypeDisplay = (logType) => {
  const types = {
    'WORK_START': {
      text: t('employeeActivities.logTypes.WORK_START'),
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      icon: '🏢'
    },
    'WORK_END': {
      text: t('employeeActivities.logTypes.WORK_END'),
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      icon: '🏡'
    },
    'BREAK_START': {
      text: t('employeeActivities.logTypes.BREAK_START'),
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      icon: '☕'
    },
    'BREAK_END': {
      text: t('employeeActivities.logTypes.BREAK_END'),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: '👨‍💼'
    }
  };
  return types[logType] || {
    text: logType,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '❓'
  };
};

// Add this helper function to format time ranges
const getTimeRangeLabel = (timeframe) => {
  const now = new Date();
  switch (timeframe) {
    case 'weekly':
    return `Last 7 days (${new Date(now - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${now.toLocaleDateString()})`;
    case 'monthly':
      return `Last 30 days (${new Date(now - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${now.toLocaleDateString()})`;
    case 'yearly':
      return `Last 365 days (${new Date(now - 365 * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${now.toLocaleDateString()})`;
    default:
      return '';
  }
};

// Add this helper function to format time in AM/PM
const formatTimeToAMPM = (hour) => {
    const hourNum = parseInt(hour);
    if (hourNum === 0) return '12:00 AM';
    if (hourNum === 12) return '12:00 PM';
    if (hourNum < 12) return `${hourNum}:00 AM`;
    return `${hourNum - 12}:00 PM`;
};


  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
 
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch stats');
        }

        setStats(data);
        setEmployeeLogs(data.employeeLogs || []);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); 

    return () => clearInterval(interval);
  }, []);

  // Line Chart Data
  const lineChartData = {
    labels: stats.chartData?.lineChart?.labels || [],
    datasets: [
      {
        label: t('charts.dailyTokens.title'),
        data: stats.chartData?.lineChart?.data || [],
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: true,
        backgroundColor: "rgba(75, 192, 192, 0.2)"
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: (value) => Math.round(value)
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: (context) => `${t('charts.dailyTokens.totalTokens')}: ${Math.round(context.parsed.y)}`
        }
      }
    }
  };

  // Doughnut Chart Data and Options (keep these as they are)
  const doughnutChartData = {
    labels: stats.chartData?.doughnutChart?.labels || ['No Data'],
    datasets: [{
      data: stats.chartData?.doughnutChart?.data || [0],
      backgroundColor: [
        "#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#9C27B0",
        "#FF9800", "#795548", "#607D8B", "#E91E63", "#2196F3"
      ],
      borderWidth: 1,
      borderColor: '#ffffff'
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 11
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label, i) => ({
              text: label.length > 25 ? label.substring(0, 25) + '...' : label,
              fillStyle: datasets[0].backgroundColor[i],
              hidden: isNaN(datasets[0].data[i]),
              lineCap: 'round',
              lineDash: [],
              lineDashOffset: 0,
              lineJoin: 'round',
              lineWidth: 1,
              strokeStyle: datasets[0].backgroundColor[i],
              index: i
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems) => {
            return tooltipItems[0].label;
          },
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return [
              `${t('charts.doughnut.tokens')}: ${value}`,
              `${t('charts.doughnut.percentage')}: ${percentage}%`
            ];
          }
        }
      },
      cutout: '60%',
      radius: '90%'
    }
  };

  // Now add the token status chart data and options
  const tokenStatusChartData = {
    labels: stats.chartData?.tokenStatusChart?.labels || ['No Data'],
    datasets: [{
      data: stats.chartData?.tokenStatusChart?.data || [0],
      backgroundColor: [
        "#4CAF50",  // Green for completed
        "#FFC107",  // Yellow for pending
        "#2196F3"   // Blue for serving
      ],
      borderWidth: 1,
      borderColor: '#ffffff'
    }]
  };

  const tokenStatusOptions = {
    ...doughnutOptions,
    plugins: {
      ...doughnutOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return [
              `${t('charts.tokenStatusOptions.count')}: ${value}`,
              `${t('charts.tokenStatusOptions.percentage')}: ${percentage}%`
            ];
          }
        }
      }
    }
  };

  // Updated busy hours data configuration with AM/PM format
  const busyHoursData = {
    labels: Array.from({ length: 24 }, (_, i) => {
      const currentHour = formatTimeToAMPM(i);
      const nextHour = formatTimeToAMPM((i + 1) % 24);
      return `${currentHour} - ${nextHour}`;
    }),
    datasets: [{
      label: t('charts.busyHours.label'),
      data: stats.busyHoursData?.[busyHoursTimeframe] || Array(24).fill(0),
      backgroundColor: '#4CAF50',
      borderColor: '#388E3C',
      borderWidth: 1,
    }]
  };

  const busyHoursOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: [t('charts.peakHours.title'), getTimeRangeLabel(busyHoursTimeframe)],
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const timeRange = context.label;
            const tokens = context.parsed.x;
            return `${tokens} ${t('charts.busyHoursTooltip.token')}${tokens !== 1 ? 's' : ''} ${t('charts.busyHoursTooltip.issuedBetween')} ${timeRange}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          stepSize: 1
        },
        title: {
          display: true,
          text: t('charts.peakHours.axisLabels.tokens')
        }
      },
      y: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: t('charts.peakHours.axisLabels.time')
        }
      }
    }
  };

  // Update the stats cards data structure
  const statsCards = [
    {
      label: t('stats.todayGathering'),
      value: loading ? "..." : stats.todayGathering?.value?.toString() || "0",
      percentage: loading ? "..." : (() => {
        const value = stats.todayGathering?.percentage;
        if (value === null || value === undefined) return "N/A";
        if (value === Infinity) return "+100";
        return value > 0 ? `+${value}` : value;
      })(),
      trend: loading ? null : stats.todayGathering?.percentage > 0 ? 'up' : 'down'
    },
    {
      label: t('stats.pendingAppointments'),
      value: loading ? "..." : stats.pendingAppointments?.value?.toString() || "0",
      percentage: loading ? "..." : stats.pendingAppointments?.percentage || "0"
    },
    {
      label: t('stats.dailyAverage'),
      value: loading ? "..." : stats.dailyAverage?.value?.toString() || "0",
      percentage: loading ? "..." : stats.dailyAverage?.percentage || "0"
    },
    {
      label: t('stats.averageWaitingTime'),
      value: loading 
        ? "..." 
        : stats.averageWaitingTime === null
          ? t('stats.noData')
          : typeof stats.averageWaitingTime.value === 'number'
            ? `${stats.averageWaitingTime.value}`
            : stats.averageWaitingTime.value,
      unit: loading 
        ? null 
        : stats.averageWaitingTime?.unit,
      percentage: null // No percentage for this metric
    }
  ];

  // Also update the employee logs time format
  const formatLogTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  // Add this helper function to filter logs
  const filteredLogs = employeeLogs.filter(log => {
    const searchLower = searchQuery.toLowerCase();
    return (
      log.employeeName.toLowerCase().includes(searchLower) ||
      log.deskName.toLowerCase().includes(searchLower) ||
      (log.currentToken?.displayNumber || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
    <div>
      <h3 className="text-xl font-semibold text-primaryGreen">{t('pageTitle')}</h3>
    </div>
      {/* Stats Cards */}
      <section className="grid grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600">{stat.label}</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
                {stat.unit && (
                  <span className="ml-1 text-lg text-gray-600">
                    {stat.unit}
                  </span>
                )}
              </p>
              {stat.percentage !== null && (
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.trend === 'up' ? 'text-green-600' : 
                  stat.trend === 'down' ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {stat.percentage}%
                  {stat.trend && (
                    <span className="ml-1">
                      {stat.trend === 'up' ? '↑' : '↓'}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Branch Stats Section */}
      <section className="grid grid-cols-6 gap-6 mt-6">
        <div className="bg-[#15CAB8] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.waitingCustomers')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.pendingTokens || 0}
          </h2>
        </div>
        <div className="bg-[#44A6E9] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.activeDesks')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.activeDesks || 0}
          </h2>
        </div>

        <div className="bg-[#FF8548] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.totalEmployees')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.totalEmployees || 0}
          </h2>
        </div>

        <div className="bg-[#15CAB8] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.onlineWorkers')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.onlineWorkers || 0}
          </h2>
        </div>

        <div className="bg-[#44A6E9] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.workersOnBreak')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.workersOnBreak || 0}
          </h2>
        </div>

        {/* <div className="bg-[#FF8548] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">Active Numerators</p>
          <h2 className="text-2xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.activeNumerators || 0}
          </h2>
        </div> */}

        <div className="bg-[#FF8548] p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <p className="text-white">{t('branchStats.activeNumerators')}</p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : stats.branchStats?.activeNumerators || 0}
          </h2>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-3 gap-6 mt-6">
      

        {/* Line Chart */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-gray-700">{t('charts.dailyTokens.title')}</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>{t('charts.dailyTokens.loading')}</p>
            </div>
          ) : (
            <div className="mt-4 h-64">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          )}
        </div>

        {/* Service Distribution Doughnut Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-gray-700">{t('charts.serviceDistribution.title')}</h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <p>{t('charts.serviceDistribution.loading')}</p>
            </div>
          ) : stats.chartData?.doughnutChart?.data?.length > 0 ? (
            <div className="mt-4 h-56">
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <p className="text-gray-500">{t('charts.serviceDistribution.noData')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Combined Activity Analysis Section */}
      <section className="mt-6 grid grid-cols-2 gap-6">
         {/* Employee Activity Logs */}
         <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">{t('employeeActivities.title')}</h3>
            
            {/* Search Bar */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder={t('employeeActivities.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 outline-none py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryGreen focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
            </div>
          </div>
          
          {/* Column Headers */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-3 border-b border-gray-200 font-semibold text-gray-700 bg-gray-50 rounded-t-lg">
            {/* Employee & Counter Info - 5 columns */}
            <div className="col-span-5 flex items-center">
              <div className="flex items-center space-x-2">
                <span className="w-8"></span>
                <span>{t('employeeActivities.logs.employeeCounter')}</span>
              </div>
            </div>
            
            {/* Status - 3 columns */}
            <div className="col-span-3 place-self-center text-center">
              <span>{t('employeeActivities.logs.status')}</span>
            </div>
            
            {/* Current Token - 2 columns */}
            <div className="col-span-2 text-center">
              <span>{t('employeeActivities.logs.currentToken')}</span>
            </div>
            
            {/* Time - 2 columns */}
            <div className="col-span-2 place-self-center text-center">
              <span>{t('employeeActivities.logs.time')}</span>
            </div>
          </div>

          {/* Activity Logs List */}
          <div className="space-y-2 h-[850px] overflow-y-auto mt-2">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const logType = getLogTypeDisplay(log.logType);
                return (
                  <div 
                    key={log.id} 
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    {/* Employee & Counter Info */}
                    <div className="md:col-span-5 flex items-center space-x-3">
                      <span className="text-2xl w-8 text-center flex-shrink-0">{logType.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {log.employeeName}
                          </span>
                          <span className="text-gray-400 hidden md:inline">|</span>
                          <span className="text-gray-600 truncate">
                            {log.deskName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-3 flex items-center md:justify-center mt-2 md:mt-0">
                      <span className={`px-3 py-1 rounded-full text-sm ${logType.bgColor} ${logType.textColor} whitespace-nowrap`}>
                        {logType.text}
                      </span>
                    </div>

                    {/* Current Token */}
                    <div className="md:col-span-2 flex items-center md:justify-center mt-2 md:mt-0">
                      {log.currentToken ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primaryGreen bg-opacity-10 text-primaryGreen whitespace-nowrap">
                          {log.currentToken.displayNumber}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {t('employeeActivities.noData.noActiveToken')}
                        </span>
                      )}
                    </div>

                    {/* Time */}
                    <div className="md:col-span-2 flex items-center md:justify-center mt-2 md:mt-0">
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        {formatLogTime(log.time)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-4">
                {searchQuery ? t('employeeActivities.noData.noMatching') : t('employeeActivities.noData.noActivities')}
              </div>
            )}
          </div>
        </div>
        {/* Busy Hours Chart */}
        <div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">{t('charts.peakHours.title')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setBusyHoursTimeframe('weekly')}
                className={`px-3 py-1 rounded ${
                  busyHoursTimeframe === 'weekly'
                    ? 'bg-primaryOrange text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('charts.peakHours.timeframes.week')}
              </button>
              <button
                onClick={() => setBusyHoursTimeframe('monthly')}
                className={`px-3 py-1 rounded ${
                  busyHoursTimeframe === 'monthly'
                    ? 'bg-primaryOrange text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('charts.peakHours.timeframes.month')}
              </button>
              <button
                onClick={() => setBusyHoursTimeframe('yearly')}
                className={`px-3 py-1 rounded ${
                  busyHoursTimeframe === 'yearly'
                    ? 'bg-primaryOrange text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('charts.peakHours.timeframes.year')}
              </button>
            </div>
          </div>
          <div className="h-[600px]">
            <Bar 
              data={busyHoursData} 
              options={busyHoursOptions}
            />
          </div>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <p>{t('charts.peakHours.description.line1')}</p>
            <p>{t('charts.peakHours.description.line2')}</p>
          </div>
        </div>
          {/* Doughnut Chart */}
          <div className="col-span-1 mt-6 bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-bold text-gray-700">{t('charts.tokenStatusDistribution.title')}</h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <p>{t('charts.tokenStatusDistribution.loading')}</p>
            </div>
          ) : stats.chartData?.tokenStatusChart?.data?.some(val => val > 0) ? (
            <div className="mt-4 h-56">
              <Doughnut data={tokenStatusChartData} options={tokenStatusOptions} />
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <p className="text-gray-500">{t('charts.tokenStatusDistribution.noData')}</p>
            </div>
          )}
        </div>
        </div>

       
      </section>
    </>
  );
}
