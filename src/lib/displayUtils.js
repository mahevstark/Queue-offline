export const fetchDisplayTokens = async (branchId) => {
    try {
        const response = await fetch(`/api/display-tokens?branchId=${branchId}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch tokens');
        }

        return {
            currentTokens: Array.isArray(data.currentTokens) ? data.currentTokens : [],
            nextTokens: Array.isArray(data.nextTokens) ? data.nextTokens : []
        };
    } catch (error) {
        console.error('Error fetching display tokens:', error);
        throw error;
    }
};