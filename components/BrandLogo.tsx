import { Flame } from 'lucide-react'

export default function BrandLogo() {
    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <Flame className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                FireEye
            </span>
        </div>
    )
}
