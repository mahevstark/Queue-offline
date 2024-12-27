import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authMiddleware } from '@/middleware/authMiddleware';

export async function GET(request) {
  try {
    const authResult = await authMiddleware(request);
    
    // Check if authResult is a Response (error case)
    if (authResult instanceof Response) {
      return authResult;
    }

    // Extract user data from authResult
    const { userId, role, branchId } = authResult;
    
    // Set whereClause based on role and branchId
    let whereClause = {};
    if (role === 'MANAGER' && branchId) {
      whereClause = { branchId: Number(branchId) };
    } else if (role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Set up date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Calculate last 7 days for chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();

    // Get employee logs first
    const employeeLogs = await prisma.userLog.findMany({
      where: {
        ...(branchId ? {
          user: {
            branchId: Number(branchId)
          }
        } : {}),
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            assignedDesk: {
              select: {
                name: true
              }
            },
            tokens: {
              where: {
                status: 'SERVING'
              },
              take: 1,
              orderBy: {
                updatedAt: 'desc'
              },
              select: {
                id: true,
                displayNumber: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    // Transform logs
    const transformedLogs = employeeLogs.map(log => ({
      id: log.id,
      employeeName: log.user.fullName,
      deskName: log.user.assignedDesk?.name || 'No Desk',
      logType: log.logType,
      time: log.startTime,
      currentToken: log.user.tokens[0] || null
    }));

    // Get all stats in parallel with branch filtering
    const [
      todayGathering,
      yesterdayGathering,
      pendingAppointments,
      yesterdayPending,
      currentMonthCompleted,
      previousMonthCompleted,
      tokensServedToday,
      dailyTokenCounts,
      serviceTokens,
      tokenStatusDistribution
    ] = await Promise.all([
      // Today's gathering
      prisma.token.count({
        where: {
          ...whereClause,
          createdAt: { gte: today, lt: tomorrow }
        }
      }),

      // Yesterday's gathering
      prisma.token.count({
        where: {
          ...whereClause,
          createdAt: { gte: yesterday, lt: today }
        }
      }),

      // Current pending
      prisma.token.count({
        where: {
          ...whereClause,
          status: 'PENDING'
        }
      }),

      // Yesterday pending
      prisma.token.count({
        where: {
          ...whereClause,
          status: 'PENDING',
          createdAt: { gte: yesterday, lt: today }
        }
      }),

      // Current month completed
      prisma.token.count({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          updatedAt: { gte: thirtyDaysAgo }
        }
      }),

      // Previous month completed
      prisma.token.count({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }
        }
      }),

      // Tokens served today with waiting time calculation
      prisma.token.findMany({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          updatedAt: { gte: today, lt: tomorrow }
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      }),

      // Daily token counts for last 7 days
      Promise.all(
        last7Days.map(date => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          return prisma.token.count({
            where: {
              ...whereClause,
              createdAt: { gte: date, lt: nextDay }
            }
          });
        })
      ),

      // Service distribution
      prisma.token.groupBy({
        by: ['serviceId'],
        _count: {
          _all: true
        },
        where: {
          ...whereClause,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),

      // Token status distribution
      prisma.token.groupBy({
        by: ['status'],
        where: {
          ...whereClause,
          createdAt: { gte: today, lt: tomorrow }
        },
        _count: {
          _all: true
        }
      })
    ]);

    // Calculate average waiting time
    const averageWaitingTime = (() => {
      if (tokensServedToday.length === 0) return null;
      
      const totalWaitTime = tokensServedToday.reduce((acc, token) => {
        const waitTime = new Date(token.updatedAt) - new Date(token.createdAt);
        return acc + waitTime;
      }, 0);
      
      // Convert to minutes and round to nearest minute
      const avgMinutes = Math.round(totalWaitTime / (tokensServedToday.length * 60000));
      
      // Format the time appropriately
      if (avgMinutes < 60) {
        return { value: avgMinutes, unit: 'min' };
      } else {
        const hours = Math.floor(avgMinutes / 60);
        const minutes = avgMinutes % 60;
        return {
          value: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`,
          unit: null
        };
      }
    })();

    // Get branch stats
    const branchStats = await getBranchStats(role === 'MANAGER' ? Number(branchId) : null);

    // Get service distribution with names
    const serviceDistribution = await prisma.token.groupBy({
      by: ['subServiceId'],
      where: {
        ...whereClause,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _count: {
        _all: true
      }
    });

    console.log('Service Distribution:', serviceDistribution);

    // Get complete service details
    const subServices = await prisma.subService.findMany({
      where: {
        id: {
          in: serviceDistribution.map(item => item.subServiceId)
        }
      },
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log('Sub Services with Service Names:', subServices);

    // Format for doughnut chart with proper names
    const doughnutChart = {
      labels: serviceDistribution.map(item => {
        const subService = subServices.find(s => s.id === item.subServiceId);
        return subService ? `${subService.service.name} - ${subService.name}` : 'Unknown Service';
      }),
      data: serviceDistribution.map(item => item._count._all)
    };

    console.log('API Doughnut Chart Data:', doughnutChart);

    // Inside GET function, add this new query
    const getBusyHoursData = async (startDate, endDate) => {
        const busyHours = await prisma.token.groupBy({
            by: ['createdAt'],
            where: {
                ...whereClause,
                createdAt: {
                    gte: startDate,
                    lt: endDate
                }
            },
            _count: true
        });

        // Create 24-hour slots
        const hourlyDistribution = Array(24).fill(0);
        
        busyHours.forEach(entry => {
            const hour = new Date(entry.createdAt).getHours();
            hourlyDistribution[hour] += entry._count;
        });

        return hourlyDistribution;
    };

    // Get busy hours for different time periods
    const [weeklyBusyHours, monthlyBusyHours, yearlyBusyHours] = await Promise.all([
        // Weekly (last 7 days)
        getBusyHoursData(
            new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            tomorrow
        ),
        // Monthly (last 30 days)
        getBusyHoursData(
            new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
            tomorrow
        ),
        // Yearly (last 365 days)
        getBusyHoursData(
            new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
            tomorrow
        )
    ]);

    // Format the response data
    const responseData = {
      todayGathering: {
        value: todayGathering || 0,
        percentage: (() => {
          if (yesterdayGathering === 0) {
            return todayGathering > 0 ? 100 : 0;
          }
          const percentage = Math.round((todayGathering - yesterdayGathering) / yesterdayGathering * 100);
          // Cap the percentage at ±100
          return Math.max(Math.min(percentage, 100), -100);
        })()
      },
      pendingAppointments: {
        value: pendingAppointments || 0,
        percentage: yesterdayPending ? Math.round((pendingAppointments - yesterdayPending) / yesterdayPending * 100) : 0
      },
      dailyAverage: {
        value: Math.round(dailyTokenCounts.reduce((a, b) => a + b, 0) / dailyTokenCounts.length),
        percentage: '0'
      },
      averageWaitingTime,
      chartData: {
        lineChart: {
          labels: last7Days.map(date => date.toLocaleDateString()),
          data: dailyTokenCounts
        },
        doughnutChart: doughnutChart,
        tokenStatusChart: {
          labels: ['Completed', 'Pending', 'Serving'],
          data: [
            tokenStatusDistribution.find(t => t.status === 'COMPLETED')?._count._all || 0,
            tokenStatusDistribution.find(t => t.status === 'PENDING')?._count._all || 0,
            tokenStatusDistribution.find(t => t.status === 'SERVING')?._count._all || 0
          ]
        }
      },
      branchStats,
      employeeLogs: transformedLogs,
      busyHoursData: {
        weekly: weeklyBusyHours,
        monthly: monthlyBusyHours,
        yearly: yearlyBusyHours
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to get branch stats
async function getBranchStats(branchId) {
  const whereClause = branchId ? { branchId } : {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [
    pendingTokens,
    activeDesks,
    totalEmployees,
    onlineWorkers,
    workersOnBreak,
    totalNumerators,
    activeNumerators
  ] = await Promise.all([
    prisma.token.count({
      where: {
        ...whereClause,
        status: 'PENDING',
      }
    }),
    prisma.desk.count({
      where: {
        ...whereClause,
        status: 'ACTIVE',
      }
    }),
    prisma.user.count({
      where: {
        ...whereClause,
        role: 'EMPLOYEE',
        status: 'ACTIVE'
      }
    }),
    prisma.user.count({
      where: {
        ...whereClause,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        isWorking: true,
        isOnBreak: false
      }
    }),
    prisma.user.count({
      where: {
        ...whereClause,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        isWorking: true,
        isOnBreak: true
      }
    }),
    prisma.numerator.count({
      where: {
        ...whereClause,
      }
    }),
    prisma.numerator.count({
      where: {
        ...whereClause,
        status: 'ACTIVE'
      }
    })
  ]);

  return {
    pendingTokens,
    activeDesks,
    totalEmployees,
    onlineWorkers,
    workersOnBreak,
    totalNumerators,
    activeNumerators
  };
}