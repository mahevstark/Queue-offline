import { fetchWithAuth } from '@/lib/apiUtils';

const BASE_URL = '/api/logs';

const userLogService = {
  getUserLogs: async (userId, filters = {}) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetchWithAuth(`/api/users/${userId}/logs?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch logs');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error in getUserLogs:', error);
      throw error;
    }
  },

  createUserLog: async (userId, logData) => {
    try {
      console.log('Creating user log:', { userId, logData });
      
      const response = await fetchWithAuth(`/api/users/${userId}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });

      const data = await response.json();
      console.log('Create log response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create log');
      }

      return data.data;
    } catch (error) {
      console.error('Error in createUserLog:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  },

  getUserLogsSummary: async (userId, dateParams) => {
    try {
      const queryParams = new URLSearchParams(dateParams).toString();
      const response = await fetchWithAuth(`/api/users/${userId}/logs/summary?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch log summary');
      }

      return data.data;
    } catch (error) {
      console.error('Error in getUserLogsSummary:', error);
      throw error;
    }
  }
};

export default userLogService;