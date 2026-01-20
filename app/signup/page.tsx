'use client'

import { useState, useEffect } from 'react'
import { isValidEmail } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Flame, Check, X } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/contexts/ToastContext'
import { LiquidInput, LiquidButton } from '@/components/Liquid'
import { cn } from '@/lib/utils'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; confirmPassword?: string; general?: string }>({})
    const router = useRouter()
    const { showToast } = useToast()

    const [strengthScore, setStrengthScore] = useState(0)
    const [passwordRequirements, setPasswordRequirements] = useState({
        length: false, uppercase: false, lowercase: false, number: false, special: false
    })

    useEffect(() => {
        const reqs = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        }
        setPasswordRequirements(reqs)
        setStrengthScore(Object.values(reqs).filter(Boolean).length)
    }, [password])

    const getStrengthColor = () => {
        if (strengthScore <= 2) return 'bg-red-500'
        if (strengthScore === 3) return 'bg-yellow-500'
        if (strengthScore === 4) return 'bg-blue-500'
        return 'bg-green-500'
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        const newErrors: typeof errors = {}
        if (!fullName.trim()) newErrors.fullName = 'Required'
        if (!isValidEmail(email)) newErrors.email = 'Invalid email'
        if (strengthScore < 5) newErrors.password = 'Too weak'
        if (password !== confirmPassword) newErrors.confirmPassword = 'Mismatch'

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setLoading(true)
        setErrors({})

        const { error } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName } },
        })

        if (error) {
            setErrors({ general: error.message })
            setLoading(false)
        } else {
            showToast('Account created! Please check your email.', 'success')
            router.push('/auth/verify-email')
        }
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-black overflow-hidden px-4">
            <div className="w-full max-w-[400px] liquid-card relative z-10 animate-slide-up flex flex-col max-h-[98vh] border-0 shadow-2xl md:!overflow-visible">
                {/* Header */}
                <div className="px-8 pt-6 pb-4 text-center flex-shrink-0">
                    <div className="mx-auto h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
                        <Flame className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Create Account</h2>
                </div>

                {/* Form Area - Scrollable if needed, visible overflow on desktop for popup */}
                <div className="px-8 pb-6 overflow-y-auto md:overflow-visible custom-scrollbar flex-grow">
                    <form className="space-y-4" onSubmit={handleSignup} noValidate>
                        <LiquidInput
                            label="Full Name"
                            id="full-name"
                            name="fullName"
                            type="text"
                            required
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(p => ({ ...p, fullName: undefined })) }}
                            error={errors.fullName}
                            className="py-2 text-sm h-10"
                        />
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
                        <div className="relative group">
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

                            {/* Password Strength Popup */}
                            {password && (
                                <>
                                    {/* Mobile: Inline */}
                                    <div className="block md:hidden mt-2 p-2 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="flex h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                                            <div className={cn("h-full transition-all duration-300", getStrengthColor())} style={{ width: `${(strengthScore / 5) * 100}%` }} />
                                        </div>
                                        <div className="flex gap-2 justify-between flex-wrap">
                                            {[
                                                { met: passwordRequirements.length, label: '8+' },
                                                { met: passwordRequirements.uppercase, label: 'ABC' },
                                                { met: passwordRequirements.lowercase, label: 'abc' },
                                                { met: passwordRequirements.number, label: '123' },
                                                { met: passwordRequirements.special, label: '#@!' },
                                            ].map((req, i) => (
                                                <span key={i} className={cn("text-[10px] flex items-center gap-1", req.met ? "text-green-500 font-medium" : "text-gray-400")}>
                                                    {req.met ? <Check className="h-2.5 w-2.5" /> : <div className="h-1 w-1 bg-current rounded-full" />}
                                                    {req.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Desktop: Pop-up on Right */}
                                    <div className="hidden md:block absolute left-[105%] top-0 w-64 p-4 bg-white dark:bg-[#111] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 animate-fade-in z-50">
                                        <div className="absolute top-6 -left-2 w-4 h-4 bg-white dark:bg-[#111] transform rotate-45 border-l border-b border-gray-100 dark:border-white/10"></div>
                                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Password Strength</h4>
                                        <div className="flex h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                                            <div className={cn("h-full transition-all duration-300", getStrengthColor())} style={{ width: `${(strengthScore / 5) * 100}%` }} />
                                        </div>
                                        <div className="space-y-2">
                                            {[
                                                { met: passwordRequirements.length, label: 'At least 8 characters' },
                                                { met: passwordRequirements.uppercase, label: 'Uppercase letter (A-Z)' },
                                                { met: passwordRequirements.lowercase, label: 'Lowercase letter (a-z)' },
                                                { met: passwordRequirements.number, label: 'Number (0-9)' },
                                                { met: passwordRequirements.special, label: 'Special character (!@#)' },
                                            ].map((req, i) => (
                                                <div key={i} className={cn("text-xs flex items-center gap-2", req.met ? "text-green-500" : "text-gray-400")}>
                                                    {req.met ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />}
                                                    <span className={req.met ? "text-gray-700 dark:text-gray-300" : ""}>{req.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <LiquidInput
                            label="Confirm Password"
                            id="confirm-password"
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined })) }}
                            error={errors.confirmPassword}
                            className="py-2 text-sm h-10"
                        />

                        {errors.general && (
                            <div className="text-red-500 text-xs text-center bg-red-50/50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                {errors.general}
                            </div>
                        )}

                        <LiquidButton type="submit" disabled={loading} className="w-full py-2.5 text-sm font-semibold h-10 mt-2">
                            {loading ? <FireEyeLoader size="xs" /> : 'Create Account'}
                        </LiquidButton>
                    </form>

                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="px-2 bg-white dark:bg-[#0A0A0A] text-gray-400">Or continue with</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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

                    <div className="text-center pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Already have an account? </span>
                        <Link href="/login" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
