export function errorHandler(error, req, res) {
    console.error('API Error:', error);

    // Check if the error is a Prisma error
    if (error.code) {
        switch (error.code) {
            case 'P2002':
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'A record with this value already exists'
                    }),
                    {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            default:
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Database error occurred'
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
        }
    }

    // Generic error response
    return new Response(
        JSON.stringify({
            success: false,
            error: error.message || 'An unexpected error occurred'
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}