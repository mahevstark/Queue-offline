import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const { branchId, deskId } = params;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeEmployees, tokensProcessedToday, averageServiceTime] = await Promise.all([
      // Count active employees
      prisma.user.count({
        where: {
          deskId: parseInt(deskId),
          branchId: parseInt(branchId),
          status: 'ACTIVE',
        },
      }),

      // Count tokens processed today
      prisma.token.count({
        where: {
          deskId: parseInt(deskId),
          branchId: parseInt(branchId),
          status: 'COMPLETED',
          completionTime: {
            gte: today,
          },
        },
      }),

      // Calculate average service time
      prisma.token.aggregate({
        where: {
          deskId: parseInt(deskId),
          branchId: parseInt(branchId),
          status: 'COMPLETED',
          completionTime: {
            gte: today,
          },
        },
        _avg: {
          serviceTime: true,
        },
      }),
    ]);

    return NextResponse.json({
      activeEmployees,
      tokensProcessedToday,
      averageServiceTime: averageServiceTime._avg.serviceTime || 0,
    });
  } catch (error) {
    console.error('Error fetching desk statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch desk statistics' },
      { status: 500 }
    );
  }
}