import { fetchWithAuth, ApiError } from '@/lib/apiUtils';
import { getAuthToken } from '@/lib/clientAuth';
const tokenSeriesService = {
    getBranchTokenSeries: async (branchId) => {
        try {
            const response = await fetchWithAuth(`/api/branches/${branchId}/token-series`);
            
            
            if (Array.isArray(response)) {
                return response;
            }
            
            if (!response?.success) {
                throw new Error(response?.error || 'Failed to fetch token series');
            }
            
            return response.data || [];
            
        } catch (error) {
            console.error('Detailed error in getBranchTokenSeries:', {
                message: error.message,
                status: error.status,
                details: error.details,
                stack: error.stack
            });
            
            const errorMessages = {
                401: 'Your session has expired. Please log in again.',
                403: 'You don\'t have permission to view token series.',
                404: 'Branch not found.',
                500: 'Server error. Please try again later.',
            };

            const message = errorMessages[error.status] || 'Failed to load token series. Please try again.';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            enhancedError.retryable = error.status >= 500;
            enhancedError.details = error.details;
            
            throw enhancedError;
        }
    },

    getBranchServices: async (branchId) => {
        try {
            const response = await fetchWithAuth(`/api/branches/${branchId}/services`);
            
            
            if (Array.isArray(response)) {
                return response;
            }
            
            if (!response?.success) {
                throw new Error(response?.error || 'Failed to fetch services');
            }
            
            return response.data || [];
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

    createTokenSeries: async (branchId, seriesData) => {
        try {
            const response = await fetch(`/api/branches/${branchId}/token-series`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(seriesData)
            });

            // First check if the response is ok
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create token series');
            }

            // Parse the response
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to create token series');
            }

            return data.data;
        } catch (error) {
            console.error('Error in createTokenSeries:', {
                message: error.message,
                status: error.status,
                details: error.details,
                stack: error.stack
            });
            
            const errorMessages = {
                401: 'Your session has expired. Please log in again.',
                403: 'You don\'t have permission to create token series.',
                404: 'Branch not found.',
                409: 'An active token series already exists for this service.',
                500: 'Server error. Please try again later.',
            };

            const message = errorMessages[error.status] || error.message || 'Failed to create token series';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            throw enhancedError;
        }
    },

    updateTokenSeriesStatus: async (branchId, seriesId, active) => {
        try {
            
            // Use fetchWithAuth but handle the response directly
            const response = await fetch(`/api/branches/${branchId}/token-series/${seriesId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                credentials: 'include',
                body: JSON.stringify({ active })
            });

            // First check if the response is ok
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status');
            }

            // Parse the response
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to update token series status');
            }

            return data.data;
        } catch (error) {
            console.error('Error in updateTokenSeriesStatus:', error);
            throw new Error('Failed to update status. Please try again.');
        }
    },

    deleteTokenSeries: async (branchId, seriesId) => {
        try {
            const response = await fetchWithAuth(`/api/branches/${branchId}/token-series/${seriesId}`, {
                method: 'DELETE'
            });

            if (!response || typeof response.success === 'undefined') {
                throw new Error('Invalid response format');
            }

            if (!response.success) {
                throw new Error(response.error || 'Failed to delete token series');
            }

            return true;
        } catch (error) {
            console.error('Error in deleteTokenSeries:', error);
            const errorMessages = {
                401: 'Your session has expired. Please log in again.',
                403: 'You don\'t have permission to delete token series.',
                404: 'Token series not found.',
                500: 'Server error. Please try again later.',
            };

            const message = errorMessages[error.status] || 'Failed to delete token series';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            throw enhancedError;
        }
    },

    updateTokenSeries: async (branchId, seriesId, updateData) => {
        try {
            const response = await fetch(`/api/branches/${branchId}/token-series/${seriesId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                credentials: 'include',
                body: JSON.stringify(updateData)
            });

            // First check if the response is ok
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update token series');
            }

            // Parse the response
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to update token series');
            }

            return data.data;
        } catch (error) {
            console.error('Error in updateTokenSeries:', error);
            const errorMessages = {
                401: 'Your session has expired. Please log in again.',
                403: 'You don\'t have permission to update token series.',
                404: 'Token series not found.',
                409: 'An active token series already exists for this service.',
                500: 'Server error. Please try again later.',
            };

            const message = errorMessages[error.status] || error.message || 'Failed to update token series';
            const enhancedError = new Error(message);
            enhancedError.status = error.status;
            throw enhancedError;
        }
    }
};

export default tokenSeriesService;