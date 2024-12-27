import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { deskId } = params;

    const currentToken = await prisma.token.findFirst({
      where: {
        deskId: parseInt(deskId),
        status: 'SERVING'
      },
      include: {
        subService: true
      }
    });

    const nextToken = await prisma.token.findFirst({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        subService: true
      }
    });

    const pendingCount = await prisma.token.count({
      where: {
        status: 'PENDING'
      }
    });

    const completedCount = await prisma.token.count({
      where: {
        deskId: parseInt(deskId),
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    return NextResponse.json({
      currentToken,
      nextToken,
      pendingCount,
      completedCount
    });
  } catch (error) {
    console.error('Error fetching desk stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch desk stats' },
      { status: 500 }
    );
  }
}