'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LiquidInput, LiquidButton } from '@/components/Liquid'
import FireEyeLoader from '@/components/FireEyeLoader'
import { Lock, CheckCircle, ArrowRight } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            setSuccess(true)
            setTimeout(() => {
                router.push('/login')
            }, 3000)

        } catch (err: any) {
            setError(err.message || 'Failed to update password.')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fade-in-up text-center space-y-6">
                    <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-500 mb-6">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                        Password Updated!
                    </h2>
                    <p className="text-gray-500">
                        Redirecting you to login...
                    </p>
                    <LiquidButton onClick={() => router.push('/login')} className="w-full justify-center">
                        Go to Login Now <ArrowRight size={16} className="ml-2" />
                    </LiquidButton>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                <div className="text-center">
                    <BrandLogo className="mx-auto h-12 w-auto justify-center mb-6" />
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                        Set New Password
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Create a strong password for your account.
                    </p>
                </div>

                <div className="liquid-card p-8 bg-white dark:bg-[#1a1a1a]">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <LiquidInput
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
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
                            {loading ? <FireEyeLoader size="sm" /> : 'Update Password'}
                        </LiquidButton>
                    </form>
                </div>
            </div>
        </div>
    )
}
