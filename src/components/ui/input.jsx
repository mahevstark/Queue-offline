export function Input({ label, error, ...props }) {
    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <input
                className={`
                    block w-full rounded-md border-gray-300 shadow-sm
                    focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                    ${error ? 'border-red-300' : ''}
                `}
                {...props}
            />
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}