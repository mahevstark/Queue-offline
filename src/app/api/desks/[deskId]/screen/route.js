import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(req, { params }) {
    try {
        const { deskId } = params;
        const parsedDeskId = parseInt(deskId);
        const today = new Date();

        const desk = await prisma.desk.findUnique({
            where: { 
                id: parsedDeskId 
            },
            select: {
                id: true,
                name: true,
                employees: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        status: true,
                        logs: {
                            where: {
                                date: {
                                    gte: startOfDay(today),
                                    lte: endOfDay(today)
                                }
                            },
                            orderBy: {
                                startTime: 'desc'
                            }
                        },
                        tokens: {
                            where: {
                                status: 'SERVING'
                            },
                            take: 1,
                            orderBy: {
                                updatedAt: 'desc'
                            },
                            select: {
                                id: true,
                                displayNumber: true,
                                status: true,
                                subService: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                tokens: {
                    where: {
                        status: 'PENDING'
                    },
                    orderBy: {
                        createdAt: 'asc'
                    },
                    take: 5,
                    select: {
                        id: true,
                        displayNumber: true,
                        status: true,
                        subService: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!desk) {
            return NextResponse.json(
                { success: false, error: 'Desk not found' },
                { status: 404 }
            );
        }

        // Helper function to determine employee status from logs
        const getEmployeeStatus = (logs = []) => {
            // Debug log
            console.log('Processing logs:', logs);

            if (!logs.length) {
                return { isWorking: false, isOnBreak: false };
            }

            // Sort logs by startTime in descending order (most recent first)
            const sortedLogs = [...logs].sort((a, b) => 
                new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );

            // Get the most recent log
            const latestLog = sortedLogs[0];
            console.log('Latest log:', latestLog);

            switch (latestLog.logType) {
                case 'WORK_START':
                    return { isWorking: true, isOnBreak: false };
                case 'WORK_END':
                    return { isWorking: false, isOnBreak: false };
                case 'BREAK_START':
                    return { isWorking: true, isOnBreak: true };
                case 'BREAK_END':
                    return { isWorking: true, isOnBreak: false };
                default:
                    return { isWorking: false, isOnBreak: false };
            }
        };

        // Transform the data with debug logging
        const transformedData = {
            id: desk.id,
            name: desk.name,
            employees: desk.employees.map(employee => {
                console.log(`Processing employee ${employee.id} logs:`, employee.logs);
                const status = getEmployeeStatus(employee.logs);
                console.log(`Employee ${employee.id} status:`, status);

                return {
                    id: employee.id,
                    fullName: employee.fullName,
                    email: employee.email,
                    isWorking: status.isWorking,
                    isOnBreak: status.isOnBreak,
                    currentToken: employee.tokens[0] || null,
                    nextToken: desk.tokens[0] || null,
                    // Include raw logs for debugging
                    _debug_logs: process.env.NODE_ENV === 'development' ? employee.logs : undefined
                };
            }),
            queuedTokens: desk.tokens
        };

        return NextResponse.json({
            success: true,
            data: transformedData
        });

    } catch (error) {
        console.error('Detailed API error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch desk data',
                details: process.env.NODE_ENV === 'development' ? {
                    message: error.message,
                    stack: error.stack
                } : undefined
            },
            { status: 500 }
        );
    }
}