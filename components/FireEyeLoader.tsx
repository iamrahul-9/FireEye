import React from 'react'
import { cn } from '@/lib/utils'

interface FireEyeLoaderProps {
    fullscreen?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    text?: string
}

export default function FireEyeLoader({
    fullscreen = false,
    size = 'md',
    className,
    text
}: FireEyeLoaderProps) {

    const sizeClasses = {
        xs: 'w-5 h-5', // Button size
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    }

    const containerClasses = fullscreen
        ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 dark:bg-black/80 backdrop-blur-xl animate-fade-in"
        : "flex flex-col items-center justify-center p-4 relative"

    const dimension = sizeClasses[size] || sizeClasses.md

    return (
        <div className={cn(containerClasses, className)}>
            <div className={cn("relative flex items-center justify-center", dimension)}>
                {/* Outer Ring - Slow Rotate */}
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary border-r-transparent animate-spin-slow" />

                {/* Middle Ring - Reverse Rotate */}
                <div className="absolute inset-[15%] rounded-full border-2 border-gray-200 dark:border-white/10 border-b-primary/60 border-l-transparent animate-spin-reverse-slow" />

                {/* Inner Core - Pulse */}
                <div className="absolute inset-[35%] rounded-full bg-primary/80 blur-[2px] animate-pulse shadow-[0_0_10px_var(--color-primary)]" />
                <div className="absolute inset-[40%] rounded-full bg-white/90" />
            </div>

            {text && (
                <div className="mt-4 text-center relative z-10">
                    <p className="text-gray-500 dark:text-white/80 font-heading tracking-widest uppercase text-sm animate-pulse font-bold">
                        {text}
                    </p>
                </div>
            )}
        </div>
    )
}
