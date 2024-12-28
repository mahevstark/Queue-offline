import { fetchWithAuth } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

const tokenService = {
    generateToken: async (branchId, serviceId, subServiceId) => {
        try {
            console.log('Generating token:', { branchId, serviceId, subServiceId });
            
            const response = await fetch(`/api/branches/${branchId}/tokens/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    serviceId,
                    subServiceId
                })
            });
            
            const data = await response.json();
            console.log('Token generation response:', data);
            
            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Failed to generate token'
                };
            }
            
            return data;
            
        } catch (error) {
            console.error('Error in token generation:', error);
            return {
                success: false,
                error: 'Network error occurred while generating token'
            };
        }
    },

    getNextToken: async (deskId) => {
        return fetchWithAuth(`/api/desks/${deskId}/tokens/next`);
    },

    completeToken: async (tokenId) => {
        const response = await fetchWithAuth(`/api/tokens/${tokenId}/complete`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to complete token');
        }
    },

    getDeskTokens: async (deskId) => {
        return fetchWithAuth(`/api/desks/${deskId}/tokens`);
    },

    getBranchTokens: async (branchId) => {
        return fetchWithAuth(`/api/branches/${branchId}/tokens`);
    },

    getBranchServices: async (branchId) => {
        try {
            const response = await fetch(`/api/branches/${branchId}/services`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            // First get the JSON data
            const data = await response.json();
            
            // Check if the response was successful
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch services');
            }
            
            // Handle the successful response
            if (data.success && Array.isArray(data.data)) {
                return data.data;
            }
            
            // If data is directly an array (fallback)
            if (Array.isArray(data)) {
                return data;
            }
            
            return [];
        } catch (error) {
            console.error('Detailed error in getBranchServices:', {
                message: error.message,
                status: error.status,
                details: error.details,
                stack: error.stack
            });
            
            const message = error.status === 401 ? 'Your session has expired' : 
                           'Failed to load services. Please try again.';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            enhancedError.retryable = error.status >= 500;
            throw enhancedError;
        }
    },

    getBranchSubServices: async (branchId, serviceId) => {
        try {
             
            if (!branchId || !serviceId) {
                throw new Error('Missing required parameters');
            }

            const response = await fetch(`/api/branches/${branchId}/services/${serviceId}/sub-services`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Parse the response as JSON
            const data = await response.json();

            // Check if the response was successful
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch sub-services');
            }

            // Handle the successful response
            if (data.success && Array.isArray(data.data)) {
                return data.data;
            }

            // If data is directly an array (fallback)
            if (Array.isArray(data)) {
                return data;
            }

            return [];
        } catch (error) {
            console.error('Detailed error in getBranchSubServices:', {
                message: error.message,
                status: error.status,
                details: error.details,
                stack: error.stack
            });

            const message = error.status === 401 ? 'Your session has expired' : 
                           'Failed to load sub-services. Please try again.';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            enhancedError.retryable = error.status >= 500;
            throw enhancedError;
        }
    },

    getToken: async (tokenId) => {
        try {
            const response = await fetch(`/api/tokens/${tokenId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (!response.ok) {
                throw new ApiError(data.error || 'Failed to fetch token', response.status);
            }

            return data;
        } catch (error) {
            console.error('Error fetching token:', error);
            if (error instanceof ApiError) {
                throw error;
            }
            throw new ApiError('Internal Server Error');
        }
    },

    getNextAvailableToken: async (deskId) => {
        return fetchWithAuth(`/api/desks/${deskId}/next-token`);
    },

    getDeskTokenStats: async (branchId, deskId) => {
        return fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/token-stats`);
    },

    serveNextToken: async (tokenId) => {
        const response = await fetchWithAuth(`/api/tokens/${tokenId}/serve`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to serve next token');
        }
    },

    getDisplayTokens: async () => {
        try {
            const response = await fetchWithAuth('/api/display-tokens');

            if (!response || !response.currentTokens || !response.nextTokens) {
                throw new ApiError('Invalid display tokens response', 500);
            }

            return {
                currentTokens: Array.isArray(response.currentTokens) ? response.currentTokens : [],
                nextTokens: Array.isArray(response.nextTokens) ? response.nextTokens : []
            };
        } catch (error) {
            console.error('Error fetching display tokens:', error);
            throw new ApiError(
                error.message || 'Failed to fetch display tokens',
                error.status || 500
            );
        }
    },

    getEmployeeTokens: async (employeeId, deskId) => {
        try {
            const response = await fetchWithAuth(`/api/employees/${employeeId}/tokens`);
            return response;
        } catch (error) {
            console.error('Error fetching employee tokens:', error);
            throw error;
        }
    },

    serveNextToken: async (employeeId, deskId) => {
        try {
            const response = await fetchWithAuth(`/api/employees/${employeeId}/serve-next`, {
                method: 'POST',
                body: JSON.stringify({ deskId })
            });
            return response;
        } catch (error) {
            console.error('Error serving next token:', error);
            throw error;
        }
    },

    completeCurrentToken: async (tokenId, employeeId) => {
        try {
            const response = await fetchWithAuth(`/api/tokens/${tokenId}/complete`, {
                method: 'POST',
                body: JSON.stringify({ employeeId })
            });
            return response;
        } catch (error) {
            console.error('Error completing token:', error);
            throw error;
        }
    }
};

class ApiError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

export async function getCurrentToken() {
    return await prisma.token.findFirst({
        where: { status: 'SERVING' },
        include: { desk: true, subService: true },
    });
}

export async function getNextToken() {
    return await prisma.token.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: { subService: true },
    });
}

export async function getStats() {
    const servedCount = await prisma.token.count({
        where: { status: 'COMPLETED' },
    });
    const pendingCount = await prisma.token.count({
        where: { status: 'PENDING' },
    });

    return { served: servedCount, pending: pendingCount };
}

export default tokenService;