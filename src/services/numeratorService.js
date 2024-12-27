import { fetchWithAuth } from '@/lib/apiUtils';

const numeratorService = {
    getNumerators: async (branchId) => {
        return await fetchWithAuth(`/api/branches/${branchId}/numerators`);
    },

    createNumerator: async (branchId, data) => {
        return await fetchWithAuth(`/api/branches/${branchId}/numerators`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updateNumerator: async (branchId, numeratorId, data) => {
        return await fetchWithAuth(`/api/branches/${branchId}/numerators/${numeratorId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    deleteNumerator: async (branchId, numeratorId) => {
        return await fetchWithAuth(`/api/branches/${branchId}/numerators/${numeratorId}`, {
            method: 'DELETE'
        });
    },
};

export default numeratorService;