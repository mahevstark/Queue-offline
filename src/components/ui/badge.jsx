export function Badge({ variant = "default", children }) {
    const variants = {
        default: "bg-green-500 text-white",
        secondary: "bg-gray-200 text-gray-800",
    };

    return (
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${variants[variant]}`}>
            {children}
        </span>
    );
}
