import React from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    href?: string
    icon?: LucideIcon
    className?: string
    variant?: 'primary' | 'secondary' | 'ghost'
}

export function LiquidButton({
    href,
    icon: Icon,
    children,
    className,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    variant = 'primary',
    ...props
}: LiquidButtonProps) {
    // Base liquid-button class from globals.css + variants
    const baseClass = "liquid-button flex items-center justify-center gap-2 font-medium"

    if (href) {
        return (
            <Link
                href={href}
                className={cn(baseClass, className)}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {children}
            </Link>
        )
    }

    return (
        <button
            className={cn(baseClass, className)}
            {...props}
        >
            {Icon && <Icon className="h-4 w-4" />}
            {children}
        </button>
    )
}

// Also export LiquidCard and LiquidInput for future modularity if requested
export function LiquidCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("liquid-card", className)} {...props}>
            {children}
        </div>
    )
}

interface LiquidInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
}

export const LiquidInput = React.forwardRef<HTMLInputElement, LiquidInputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <div className="w-full">
                <input
                    ref={ref}
                    className={cn(
                        "liquid-input w-full transition-all duration-200",
                        error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in-down flex items-center gap-1.5 ml-1">
                        <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
LiquidInput.displayName = 'LiquidInput'

import { Check } from 'lucide-react'

interface LiquidCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

export function LiquidCheckbox({ className, checked, onCheckedChange, onChange, ...props }: LiquidCheckboxProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e)
        onCheckedChange?.(e.target.checked)
    }

    return (
        <label className={cn("relative flex items-center justify-center p-0.5 cursor-pointer group", className)}>
            <input
                type="checkbox"
                className="peer absolute opacity-0 w-full h-full cursor-pointer z-10"
                checked={checked}
                onChange={handleChange}
                {...props}
            />
            <div className={cn(
                "w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center duraiton-200",
                checked
                    ? "bg-primary border-primary shadow-[0_0_10px_rgba(234,88,12,0.3)] scale-100"
                    : "border-gray-400/50 dark:border-white/20 hover:border-primary/50 bg-white/5 group-hover:bg-white/10 scale-95 hover:scale-100"
            )}>
                <Check
                    className={cn(
                        "w-3.5 h-3.5 text-black font-bold transition-all duration-200",
                        checked ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                    strokeWidth={3}
                />
            </div>
        </label>
    )
}
