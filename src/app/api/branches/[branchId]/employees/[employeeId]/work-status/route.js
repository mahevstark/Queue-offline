import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { userId } = params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        isWorking: true,
        isOnBreak: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isWorking: user.isWorking,
      isOnBreak: user.isOnBreak
    });
  } catch (error) {
    console.error('Error fetching work status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work status' },
      { status: 500 }
    );
  }
}