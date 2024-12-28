'use client'

import { SessionProvider } from 'next-auth/react'
import { UserProvider } from '@/context/UserContext'
import ToastProvider from '@/app/components/providers/ToastProvider'

export default function Providers({ children }) {
    return (
        <SessionProvider>
            <UserProvider>
                {children}
                <ToastProvider />
            </UserProvider>
        </SessionProvider>
    )
}