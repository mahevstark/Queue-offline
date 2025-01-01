import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { removeAuthCookie } from '@/lib/serverAuth';

export async function POST(request) {
    try {
        const { userId } = await request.json();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                licenseKey: true,
                licenseExpiresAt: true
            }
        });

        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'User not found',
                shouldLogout: true 
            });
        }

        const now = new Date();
        const expiresAt = user.licenseExpiresAt ? new Date(user.licenseExpiresAt) : null;

        if (!user.licenseKey || !expiresAt || now > expiresAt) {
            // Clear auth cookie if license is invalid or expired
            await removeAuthCookie();
            
            return NextResponse.json({ 
                success: false, 
                error: 'License expired or invalid',
                shouldLogout: true 
            });
        }

        return NextResponse.json({ 
            success: true,
            shouldLogout: false
        });

    } catch (error) {
        console.error('License check error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            shouldLogout: false 
        });
    }
}