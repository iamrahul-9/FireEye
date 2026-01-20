'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { LiquidButton } from '@/components/Liquid'

export default function VerifyEmailPage() {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-black overflow-hidden px-4">
            <div className="w-full max-w-[400px] liquid-card relative z-10 animate-slide-up flex flex-col border-0 shadow-2xl p-8 text-center">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6">
                    <Mail className="h-8 w-8 text-primary" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Check your inbox</h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                    We've sent a verification link to your email address. Please click the link to verify your account.
                </p>

                <Link href="/login" className="w-full">
                    <LiquidButton className="w-full py-2.5 text-sm font-semibold h-10">
                        Back to Login
                    </LiquidButton>
                </Link>

                <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                    Didn't receive the email? Check your spam folder.
                </p>
            </div>
        </div>
    )
}
