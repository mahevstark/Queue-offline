import { API_BASE_URL } from '@/config';

 const subServiceManagementService = {
    async getSubServices(serviceId, token) {
        const response = await fetch(`${API_BASE_URL}/services/${serviceId}/sub-services`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch sub-services');
        }

        return response.json();
    },

    async deleteSubService(subServiceId, token) {
        const response = await fetch(`${API_BASE_URL}/sub-services/${subServiceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete sub-service');
        }

        return response.json();
    },

    // Add other methods as needed (create, update, etc.)
};
export default subServiceManagementService;