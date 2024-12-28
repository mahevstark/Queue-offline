import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
    try {
        // 1. Verify JWT_SECRET
        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not defined');
            return NextResponse.json({
                success: false,
                error: 'Server configuration error'
            }, { status: 500 });
        }

        // 2. Check Authorization Header
        const authHeader = request.headers.get('authorization');
        console.log('Auth header:', authHeader);
        
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ 
                success: false,
                error: 'No token provided' 
            }, { status: 401 });
        }

        // 3. Verify Token
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
            console.log('Decoded token:', decoded);
        } catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            return NextResponse.json({
                success: false,
                error: 'Invalid token'
            }, { status: 401 });
        }

        // 4. Check Prisma Connection
        try {
            await prisma.$connect();
        } catch (prismaError) {
            console.error('Prisma connection error:', prismaError);
            return NextResponse.json({
                success: false,
                error: 'Database connection error'
            }, { status: 500 });
        }

        // 5. Find User
        let user;
        try {
            user = await prisma.user.findUnique({
                where: { 
                    id: decoded.id 
                },
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
                    }
                },
            });

            console.log('Found user data:', user);

            if (!user) {
                return NextResponse.json({ 
                    success: false,
                    error: 'User not found' 
                }, { status: 404 });
            }

            // 6. Return Success Response
            return NextResponse.json({ 
                success: true,
                data: user
            });

        } catch (dbError) {
            console.error('Database query error:', dbError);
            return NextResponse.json({
                success: false,
                error: 'Database query failed',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Unhandled API Error:', error);
        
        return NextResponse.json({ 
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        }, { status: 500 });
    } finally {
        // 7. Disconnect Prisma
        try {
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.error('Prisma disconnect error:', disconnectError);
        }
    }
}