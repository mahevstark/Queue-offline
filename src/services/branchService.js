import { fetchWithAuth, ApiError } from '@/lib/apiUtils';
import { getAuthToken } from '@/lib/clientAuth';

const BASE_URL = '/api/branches';

const branchService = {
  getAllBranches: async () => {
    try {
      const response = await fetchWithAuth('/api/branches', {
        method: 'GET'
      });

      console.log('Raw branches response:', response);

      if (response.success !== undefined) {
        return response;
      }

      if (Array.isArray(response)) {
        return {
          success: true,
          data: response
        };
      }

      console.error('Unexpected response format:', response);
      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error in getAllBranches:', error);
      throw error;
    }
  },

  getBranch: async (branchId) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}`);
  },



  deleteBranch: async (branchId) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}`, {
      method: 'DELETE',
    });
  },

  // Desk management
  createDesk: async (branchId, deskData) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}/desks`, {
      method: 'POST',
      body: JSON.stringify(deskData),
    });
  },

  updateDesk: async (branchId, deskId, deskData) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}/desks/${deskId}`, {
      method: 'PUT',
      body: JSON.stringify(deskData),
    });
  },

  deleteDesk: async (branchId, deskId) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}/desks/${deskId}`, {
      method: 'DELETE',
    });
  },

  // Employee management
  assignEmployeesToDesk: async (branchId, deskId, employeeIds) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}/desks/${deskId}/assign-employees`, {
      method: 'POST',
      body: JSON.stringify({ employeeIds }),
    });
  },

  getDeskStatistics: async (branchId, deskId) => {
    return fetchWithAuth(`${BASE_URL}/${branchId}/desks/${deskId}/statistics`);
  },

  // Validation helper
  validateBranchData: (data) => {
    const errors = {};

    if (!data.name?.trim()) errors.name = 'Branch name is required';
    if (!data.address?.trim()) errors.address = 'Address is required';
    if (!data.city?.trim()) errors.city = 'City is required';
    if (!data.state?.trim()) errors.state = 'State is required';
    if (!data.zipCode?.trim()) errors.zipCode = 'ZIP code is required';
    if (!data.phone?.trim()) errors.phone = 'Phone number is required';

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  addEmployeeToBranch: async (branchId, employeeId) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`/api/branches/${branchId}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add employee to branch');
      }

      return data.data;
    } catch (error) {
      console.error('Error in addEmployeeToBranch:', error);
      throw error;
    }
  },

  removeEmployeeFromBranch: async (branchId, employeeId) => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`/api/branches/${branchId}/employees`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ employeeId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove employee from branch');
      }

      return data.data;
    } catch (error) {
      console.error('Error in removeEmployeeFromBranch:', error);
      throw error;
    }
  },

  getBranchServices: async (branchId) => {
    try {
      const response = await fetchWithAuth(`${BASE_URL}/${branchId}/services`);


      if (!response.success && !Array.isArray(response)) {
        throw new Error(response.error || 'Failed to fetch branch services');
      }

      return Array.isArray(response) ? { data: response } : response;
    } catch (error) {
      console.error('Error fetching branch services:', error);
      throw error;
    }
  },

  assignServiceToBranch: async (branchId, serviceId) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication required');

    const currentUser = jwt.decode(token);
    if (currentUser.role === 'MANAGER' && branchId !== currentUser.managedBranchId) {
      throw new Error('Unauthorized: Managers can only manage services for their own branch');
    }

    try {
      const response = await fetch(`${BASE_URL}/${branchId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign service');
      }
      return await response.json();
    } catch (error) {
      console.error('Error assigning service to branch:', error);
      throw error;
    }
  },

  removeServiceFromBranch: async (branchId, serviceId) => {
    try {
      const response = await fetch(`${BASE_URL}/${branchId}/services/${serviceId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove service');
      }
      return await response.json();
    } catch (error) {
      console.error('Error removing service from branch:', error);
      throw error;
    }
  },

  async createBranch(data) {

    return fetchWithAuth(`/api/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBranch(branchId, data) {
    if (!branchId) {
      throw new Error('Branch ID is required');
    }

    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${BASE_URL}/${branchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update branch');
      }

      return result;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw new Error(error.message || 'Failed to update branch');
    }
  },

  getBranchManagers: async (branchId, queryParams = '') => {
    try {
      const response = await fetchWithAuth(`/api/branches/${branchId}/managers${queryParams}`);

      console.log('Branch managers response:', response); // Debug log

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch branch managers');
      }

      return response.data || [];
    } catch (error) {
      console.error('Error in getBranchManagers:', error);
      throw error;
    }
  }
};
export default branchService;

