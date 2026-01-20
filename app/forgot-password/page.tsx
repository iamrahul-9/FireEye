'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LiquidInput, LiquidButton } from '@/components/Liquid'
import FireEyeLoader from '@/components/FireEyeLoader'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            })

            if (error) throw error

            setSuccess(true)
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                <div className="text-center">
                    <BrandLogo className="mx-auto h-12 w-auto justify-center mb-6" />
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                        Reset Password
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Enter your email to receive recovery instructions.
                    </p>
                </div>

                <div className="liquid-card p-8 bg-white dark:bg-[#1a1a1a]">
                    {!success ? (
                        <form onSubmit={handleReset} className="space-y-6">
                            <LiquidInput
                                label="Email Address"
                                type="email"
                                icon={Mail}
                                placeholder="name@fireeye.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg text-center font-bold">
                                    {error}
                                </p>
                            )}

                            <LiquidButton
                                type="submit"
                                className="w-full justify-center"
                                disabled={loading}
                            >
                                {loading ? <FireEyeLoader size="sm" /> : 'Send Reset Link'}
                            </LiquidButton>
                        </form>
                    ) : (
                        <div className="text-center py-4 space-y-4">
                            <div className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-500">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Check your email</h3>
                                <p className="text-gray-500 text-sm mt-2">
                                    We've sent a password reset link to <br /> <span className="font-bold text-gray-900 dark:text-gray-300">{email}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm font-bold text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={14} /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
