import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/emailService';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    if (!body || !body.email) {
      console.error('Invalid request body:', body);
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const { email } = body;

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
        },
      });

      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Update user with reset token
        await prisma.user.update({
          where: { email },
          data: {
            resetToken,
            resetTokenExpiry,
          },
        });

        // Send reset email
        await sendPasswordResetEmail(email, resetToken);
      }

      // Always return success for security
      return NextResponse.json(
        { 
          success: true,
          message: 'If an account exists, a reset link has been sent.' 
        },
        { status: 200 }
      );

    } catch (innerError) {
      console.error('Inner operation error:', innerError.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process password reset request'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Outer request error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request'
      },
      { status: 500 }
    );
  }
}
