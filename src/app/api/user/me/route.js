import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';


export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ 
                success: false, 
                error: 'No token provided' 
            }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, "d7ac385848b71c3131f75cd0fcd8956d9280a575425fa131b30ccb4c4e161ce5");

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                status: true,
                isAvailable: true,
                branchId: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                assignedDeskId: true,
                assignedDesk: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        status: true
                    }
                },
                licenseKey: true,
                licenseExpiresAt: true,
                licenseClientName: true,
                licenseDomain: true,
                licenseSystemKey: true
            }
        });

        if (!user) {
            return NextResponse.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }
        if(user.role === 'MANAGER'){
        // Verify license
        if (!user.licenseKey || !user.licenseExpiresAt) {
            return NextResponse.json({
                success: false,
                error: 'No valid license found'
            }, { status: 401 });
        }

        const now = new Date();
        const expiresAt = new Date(user.licenseExpiresAt);
        
        if (now > expiresAt) {
            return NextResponse.json({
                success: false,
                error: 'License has expired'
            }, { status: 401 });
            }
        }

        return NextResponse.json({ 
            success: true,
            data: user
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'Internal server error'
        }, { status: error.name === 'JsonWebTokenError' ? 401 : 500 });
    }
}