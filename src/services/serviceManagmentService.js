import { fetchWithAuth } from '@/lib/apiUtils';

const BASE_URL = '/api/services';

 const serviceManagementService = {
  getAllServices: async () => {
    return fetchWithAuth(BASE_URL);
  },

  getService: async (id) => {
    return fetchWithAuth(`${BASE_URL}/${id}`);
  },

  createService: async (data) => {
    return fetchWithAuth(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        status: data.status,
        branchIds: data.branchIds,
        subServices: data.subServices.map(sub => ({
          name: sub.name.trim(),
          status: sub.status || 'ACTIVE'
        }))
      }),
    });
  },

  updateService: async (id, data) => {
    return fetchWithAuth(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        status: data.status,
        branchIds: data.branchIds,
        subServices: data.subServices.map(sub => ({
          id: sub.id,
          name: sub.name.trim(),
          status: sub.status || 'ACTIVE'
        }))
      }),
    });
  },

  deleteService: async (id) => {
    return fetchWithAuth(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  getBranchServices: async (branchId) => {
    return fetchWithAuth(`/api/branches/${branchId}/services`);
  },

  assignServiceToBranch: async (serviceId, branchId) => {
    try {
        console.log('Assigning service:', { serviceId, branchId });

        const response = await fetchWithAuth(`/api/services/${serviceId}/branches`, {
            method: 'POST',
            body: JSON.stringify({
                branchIds: [branchId]
            })
        });

        console.log('Raw response:', response);

        // The response itself is the data we need
        if (!response || !response.id) {
            console.error('Invalid response structure:', response);
            throw new Error(response?.error || 'Failed to assign service to branch');
        }

        // If we get here, the assignment was successful
        return response;
    } catch (error) {
        console.error('Detailed error in assignServiceToBranch:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw error;
    }
  },

  removeServiceFromBranch: async (serviceId, branchId) => {
    try {
        const response = await fetchWithAuth(`/api/services/${serviceId}/branches/${branchId}`, {
            method: 'DELETE'
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to remove service from branch');
        }

        return response;
    } catch (error) {
        console.error('Error in removeServiceFromBranch:', error);
        throw error;
    }
  },

  createSubService: async (serviceId, data) => {
    return fetchWithAuth(`${BASE_URL}/${serviceId}/sub-services`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSubService: async (serviceId, subServiceId, data) => {
    return fetchWithAuth(`${BASE_URL}/${serviceId}/sub-services/${subServiceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSubService: async (serviceId, subServiceId) => {
    return fetchWithAuth(`${BASE_URL}/${serviceId}/sub-services/${subServiceId}`, {
      method: 'DELETE',
    });
  }
};
export default serviceManagementService;