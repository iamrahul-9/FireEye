import { Flame } from 'lucide-react'

interface BrandLogoProps {
    className?: string
}

export default function BrandLogo({ className = '' }: BrandLogoProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative">
                <Flame className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                FireEye
            </span>
        </div>
    )
}
