'use client'

import { useState } from 'react'
import { isValidEmail } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import Link from 'next/link'
import Image from 'next/image'
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
        if (!isValidEmail(email)) newErrors.email = 'Invalid email'
        if (!password) newErrors.password = 'Required'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setLoading(true)
        setErrors({})

        const { error } = await supabase.auth.signInWithPassword({
            email, password
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
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-black overflow-hidden px-4">
            <div className="w-full max-w-[400px] liquid-card relative z-10 animate-slide-up flex flex-col overflow-hidden max-h-[98vh] border-0 shadow-2xl">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 text-center">
                    <div className="mx-auto h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
                        <Flame className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">FireEye</h2>
                    <p className="mt-1 text-sm text-gray-500 font-medium tracking-wide">Next-Gen Safety Management</p>
                </div>

                {/* Form Area */}
                <div className="px-8 pb-8 flex-grow">
                    <form className="space-y-4" onSubmit={handleLogin} noValidate>
                        <LiquidInput
                            label="Email Address"
                            id="email-address"
                            name="email"
                            type="email"
                            required
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })) }}
                            error={errors.email}
                            className="py-2 text-sm h-10"
                        />
                        <LiquidInput
                            label="Password"
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })) }}
                            error={errors.password}
                            className="py-2 text-sm h-10"
                        />
                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        {errors.general && (
                            <div className="text-red-500 text-xs text-center bg-red-50/50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                {errors.general}
                            </div>
                        )}

                        <LiquidButton type="submit" disabled={loading} className="w-full py-2.5 text-sm font-semibold h-10 mt-2">
                            {loading ? <FireEyeLoader size="xs" /> : 'Log In'}
                        </LiquidButton>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="px-2 bg-white dark:bg-[#0A0A0A] text-gray-400">Or continue with</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } }) }}
                            className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors h-10">
                            <Image src="/google-logo.png" alt="Google" width={20} height={20} className="w-5 h-5" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Google</span>
                        </button>
                        <button type="button" onClick={async () => { await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: `${window.location.origin}/auth/callback` } }) }}
                            className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors h-10">
                            <span className="text-xl text-black dark:text-white leading-none -mt-1"></span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Apple</span>
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Don't have an account? </span>
                        <Link href="/signup" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Sign up</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
