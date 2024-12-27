import { fetchWithAuth } from '@/lib/apiUtils';

const deskService = {
    // Get all desks for a branch
    getBranchDesks: async (branchId) => {
        try {
            const data = await fetchWithAuth(`/api/branches/${branchId}/desks`);
            return data; // fetchWithAuth already handles the response parsing
        } catch (error) {
            console.error('Error in desk service:', error);
            throw error;
        }
    },

    // Get single desk
    getDesk: async (branchId, deskId) => {
        try {
            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}`);
            console.log('Get desk response:', response); // Debug log

            // If response is already the desk object (has id property)
            if (response && response.id) {
                return response;
            }
            
            // If response is in {success, data} format
            if (response?.success && response?.data) {
                return response.data;
            }

            throw new Error(response?.error || 'Failed to fetch desk details');
        } catch (error) {
            console.error('Error getting desk:', error);
            throw error;
        }
    },

    // Create new desk
    createDesk: async (branchId, data) => {
        return fetchWithAuth(`/api/branches/${branchId}/desks`, {
            method: 'POST',
            body: JSON.stringify({
                name: data.name,
                displayName: data.displayName,
                description: data.description,
                status: data.status,
                serviceIds: data.serviceIds,
                subServiceIds: data.subServiceIds
            }),
        });
    },

    // Update desk
    updateDesk: async (branchId, deskId, data) => {
        try {
            console.log('Updating desk with data:', { branchId, deskId, data });

            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });

            console.log('Update response:', response);

            if (response.id || response.success) {
                return {
                    success: true,
                    data: response.data || response
                };
            }

            throw new Error(response?.error || 'Failed to update desk');
        } catch (error) {
            console.error('Error updating desk:', error);
            throw new Error(error.message || 'Failed to update desk');
        }
    },

    // Delete desk
    deleteDesk: async (branchId, deskId) => {
        return fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}`, {
            method: 'DELETE',
          });
    },

    // Assign employees to desk
    assignEmployees: async (branchId, deskId, employeeIds) => {
        return fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/employees`, {
            method: 'PUT',
            body: JSON.stringify({ employeeIds })
        });
    },

    // Assign services to desk
    assignServices: async (branchId, deskId, serviceIds) => {
        try {
            console.log('Assigning services:', { branchId, deskId, serviceIds }); // Debug log

            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/services`, {
                method: 'PUT',
                body: JSON.stringify({ serviceIds })
            });
            
            console.log('Service assignment response:', response); // Debug log
            
            // Handle both success formats
            if (response.success === false) {
                throw new Error(response.error || 'Failed to assign services');
            }
            
            // If response is direct data or has success:true
            return response.data || response;
        } catch (error) {
            console.error('Detailed error in assignServices:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    },

    // Assign sub-services to desk
    assignSubServices: async (branchId, deskId, subServiceIds) => {
        try {
            console.log('Assigning sub-services:', { branchId, deskId, subServiceIds }); // Debug log

            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/sub-services`, {
                method: 'PUT',
                body: JSON.stringify({ subServiceIds })
            });
            
            console.log('Sub-service assignment response:', response); // Debug log
            
            // Handle both success formats
            if (response.success === false) {
                throw new Error(response.error || 'Failed to assign sub-services');
            }
            
            // If response is direct data or has success:true
            return response.data || response;
        } catch (error) {
            console.error('Detailed error in assignSubServices:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            throw error;
        }
    },

    // Get desk services
    getDeskServices: async (branchId, deskId) => {
        try {
            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/services`);
            return response;
        } catch (error) {
            console.error('Error getting desk services:', error);
            throw error;
        }
    },

    // Assign employees to desk
    assignEmployeesToDesk: async (branchId, deskId, employeeIds) => {
        try {

            const response = await fetchWithAuth(`/api/branches/${branchId}/desks/${deskId}/employees`, {
                method: 'POST',
                body: JSON.stringify({ employeeIds })
            });

            // fetchWithAuth already handles the JSON parsing
            return {
                success: true,
                data: response
            };

        } catch (error) {
            console.error('Error in assignEmployeesToDesk:', error);
            throw error;
        }
    },

    // Remove employee from desk
    removeEmployeeFromDesk: async (branchId, deskId, employeeId) => {
        try {
            return await fetchWithAuth(
                `/api/branches/${branchId}/desks/${deskId}/employees/${employeeId}`,
                {
                    method: 'DELETE'
                }
            );
        } catch (error) {
            console.error('Error removing employee from desk:', error);
            throw error;
        }
    }
};

export default deskService;