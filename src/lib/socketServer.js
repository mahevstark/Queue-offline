import { Server } from 'socket.io';
import prisma from '@/lib/prisma';

let io;

export const initSocketIO = (server) => {
    if (!io) {
        io = new Server(server, {
            path: '/api/socketio',
            transports: ['websocket'],
            pingInterval: 10000,
            pingTimeout: 5000,
            cors: {
                origin: '*',
            },
            connectionStateRecovery: {
                maxDisconnectionDuration: 2000,
                skipMiddlewares: true,
            },
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('joinDesk', (deskId) => {
                socket.join(`desk:${deskId}`);
                emitDeskUpdate(deskId);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

// Helper function for token updates
export const emitTokenUpdate = async (branchId) => {
    try {
        const io = getIO(); // Get the initialized Socket.IO instance

        const [currentTokens, nextTokens] = await Promise.all([
            prisma.token.findMany({
                where: { status: 'SERVING',
                    branchId: branchId,
                 },
                include: {
                    desk: true,
                    subService: {
                        include: {
                            service: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' },
                take: 10,
            }),
            prisma.token.findMany({
                where: {  branchId: branchId,status: 'PENDING' },
                include: {
                    desk: true,
                    subService: {
                        include: {
                            service: true
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    }
                },
                orderBy: { createdAt: 'asc' },
                take: 10,
            }),
        ]);

         // Emit to specific branch room
         io.to(`branch:${branchId}`).emit('tokenUpdate', { currentTokens, nextTokens });
        
         // Also emit to the general token update channel
         io.emit('tokenUpdate', { currentTokens, nextTokens, branchId });
    } catch (error) {
        console.error('Error emitting token update:', error);
    }
};

export const emitDeskUpdate = async (deskId) => {
    try {
        const io = getIO(); // Get the initialized Socket.IO instance

        const desk = await prisma.desk.findUnique({
            where: { id: parseInt(deskId) },
            include: {
                employees: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        isWorking: true,
                        isOnBreak: true,
                        tokens: {
                            where: { status: 'SERVING' },
                            take: 1,
                            orderBy: { updatedAt: 'desc' }
                        }
                    }
                },
                tokens: {
                    where: { status: 'PENDING' },
                    orderBy: { createdAt: 'asc' },
                    take: 5,
                    include: { subService: true }
                }
            }
        });

        if (desk) {
            const transformedData = {
                id: desk.id,
                name: desk.name,
                employees: desk.employees.map(employee => ({
                    id: employee.id,
                    fullName: employee.fullName,
                    email: employee.email,
                    isWorking: employee.isWorking || false,
                    isOnBreak: employee.isOnBreak || false,
                    currentToken: employee.tokens[0] || null,
                    nextToken: desk.tokens[0] || null
                })),
                queuedTokens: desk.tokens
            };

            io.to(`desk:${deskId}`).emit('deskUpdate', transformedData);
        }
    } catch (error) {
        console.error('Error emitting desk update:', error);
    }
};
