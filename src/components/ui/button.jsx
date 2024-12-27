import React from "react";

export function Button({ children, variant = "default", size = "md", asChild = false, ...props }) {
    const variants = {
        default: "bg-blue-500 text-white hover:bg-blue-600",
        outline: "border border-gray-300 text-gray-700 hover:bg-gray-100",
    };

    const sizes = {
        sm: "px-2 py-1 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
    };

    const Component = asChild ? "div" : "button";

    return (
        <Component
            className={`inline-flex items-center justify-center rounded-md font-medium ${variants[variant]} ${sizes[size]}`}
            {...props}
        >
            {children}
        </Component>
    );
}
