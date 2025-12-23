'use client'

import { useState } from 'react'
import { isValidEmail } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import { LiquidInput, LiquidButton } from '@/components/Liquid'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
    const router = useRouter()
    const { showToast } = useToast()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: typeof errors = {}

        if (!isValidEmail(email)) {
            newErrors.email = 'Please enter a valid email address'
        }
        if (!password) {
            newErrors.password = 'Please enter your password'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setLoading(true)
        setErrors({})

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setErrors({ general: error.message })
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">


            <div className="max-w-md w-full space-y-8 liquid-card p-10 relative z-10 animate-slide-up">
                <div className="text-center">
                    <div className="mx-auto h-20 w-20 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                        <Flame className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="mt-6 text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        FireEye
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Next-Gen Safety Management
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin} noValidate>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <LiquidInput
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                                }}
                                error={errors.email}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <LiquidInput
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="Password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                                }}
                                error={errors.password}
                            />
                        </div>
                    </div>

                    {errors.general && (
                        <div className="text-red-500 text-sm text-center bg-red-50/50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 backdrop-blur-sm animate-fade-in">
                            {errors.general}
                        </div>
                    )}

                    <div>
                        <LiquidButton
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <FireEyeLoader size="xs" />
                            ) : (
                                'Sign in'
                            )}
                        </LiquidButton>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Don't have an account? </span>
                        <Link href="/signup" className="font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors">
                            Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
