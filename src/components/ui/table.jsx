export function Table({ children, className = "" }) {
    return (
        <div className="w-full rounded-lg bg-white shadow-sm">
            <table className={`w-full text-center text-sm ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children, className = "" }) {
    return (
        <thead className={`bg-gray-50 text-xs uppercase tracking-wider text-gray-700 ${className}`}>
            {children}
        </thead>
    );
}

export function TableRow({ children, className = "", isHoverable = true }) {
    return (
        <tr className={`
            border-b border-gray-200 bg-white
            ${isHoverable ? 'transition-colors hover:bg-gray-50/50' : ''}
            ${className}
        `}>
            {children}
        </tr>
    );
}

export function TableHead({ children, className = "", align = "center" }) {
    return (
        <th className={`
            whitespace-nowrap px-4 py-3 font-medium text-gray-900
            ${align === 'center' ? 'text-center' : ''}
            ${align === 'right' ? 'text-right' : ''}
            ${className}
        `}>
            {children}
        </th>
    );
}

export function TableBody({ children, className = "" }) {
    return (
        <tbody className={`divide-y divide-gray-200 ${className}`}>
            {children}
        </tbody>
    );
}

export function TableCell({ 
    children, 
    className = "", 
    align = "center",
    isCompact = false 
}) {
    return (
        <td className={`
            whitespace-nowrap
            ${isCompact ? 'px-3 py-2' : 'px-4 py-3'}
            ${align === 'center' ? 'text-center' : ''}
            ${align === 'right' ? 'text-right' : ''}
            ${className}
        `}>
            {children}
        </td>
    );
}

// New components for enhanced functionality

export function TableCellBadge({ 
    children, 
    variant = 'default',
    size = 'md'
}) {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800'
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm'
    };

    return (
        <span className={`
            inline-flex items-center rounded-full font-medium
            ${variants[variant]}
            ${sizes[size]}
        `}>
            {children}
        </span>
    );
}

export function TableCellAction({ children }) {
    return (
        <div className="flex items-center justify-center gap-2">
            {children}
        </div>
    );
}

export function TableEmpty({ message = "No data available" }) {
    return (
        <tr>
            <td 
                colSpan="100%" 
                className="py-8 text-center text-gray-500"
            >
                <div className="flex flex-col items-center gap-2">
                    <svg 
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                        />
                    </svg>
                    <span>{message}</span>
                </div>
            </td>
        </tr>
    );
}
