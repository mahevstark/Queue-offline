import { createServer } from 'http';
import { parse } from 'url';
import { initSocketIO } from '@/lib/socketServer';

let io;

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function socketMiddleware(req, res) {
    try {
        if (!io) {
            const server = createServer();
            io = initSocketIO(server);
        }

        // Handle Socket.IO requests
        if (req.url.startsWith('/api/socketio')) {
            io.handleRequest(req, res);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Socket middleware error:', error);
        return false;
    }
}