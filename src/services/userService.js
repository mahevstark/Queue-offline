import { fetchWithAuth } from '@/lib/apiUtils';

const BASE_URL = '/api/users';

const userService = {
  getUsers: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return fetchWithAuth(`${BASE_URL}?${queryParams}`);
  },

  getUser: async (id) => {
    return fetchWithAuth(`${BASE_URL}/${id}`);
  },

  createUser: async (userData) => {
    const requestBody = {
      email: userData.email,
      fullName: userData.fullName,
      password: userData.password,
      role: userData.role,
      status: userData.status,
    };

    return fetchWithAuth(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },


  updateUser: async (id, userData) => {
    const requestBody = {
        email: userData.email,
        fullName: userData.fullName,
        status: userData.status,
        password: userData.password,
        role: userData.role,
        branchId: userData.branchId
    };

    Object.keys(requestBody).forEach(key => 
        requestBody[key] === undefined && key !== 'password' && delete requestBody[key]
    );

    return fetchWithAuth(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
    });
  },

  deleteUser: async (id) => {
    return fetchWithAuth(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  },

  getUserLogs: async (userId, params) => {
    try {
        const queryParams = new URLSearchParams({
            startDate: params.startDate,
            endDate: params.endDate,
            logType: params.logType
        }).toString();

        const response = await fetchWithAuth(`/api/users/${userId}/logs?${queryParams}`);
        return response;
    } catch (error) {
        console.error('Error in getUserLogs:', error);
        throw error;
    }
  },

  getUserLogsSummary: async (userId, dateParams) => {
    try {
        const queryParams = new URLSearchParams(dateParams).toString();
        const response = await fetchWithAuth(`/api/users/${userId}/logs/summary?${queryParams}`);
   
        return response.data;
    } catch (error) {
        console.error('Error fetching log summary:', error);
        throw error;
    }
  },

  createUserLog: async (userId, logData) => {
   
        return await fetchWithAuth(`/api/users/${userId}/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData)
        });

  },

  getBranches: async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  },

  getManagers: async () => {
    try {
      const data = await fetchWithAuth(`${BASE_URL}/managers`);

      return data || [];
    } catch (error) {
      console.error('Error in getManagers:', error);
      throw error;
    }
  },
};

export default userService;