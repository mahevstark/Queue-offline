import { NextResponse } from 'next/server';
import socketMiddleware from '@/middleware/socketMiddleware';

export async function GET(req) {
    try {
        // Create a mock response object
        const res = new Response();
        
        // Handle Socket.IO connection
        const handled = await socketMiddleware(req, res);
        
        if (handled) {
            return res;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Socket.IO Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';