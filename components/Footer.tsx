import Link from 'next/link'
import { Flame, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-900 dark:bg-black/40 dark:border-t dark:border-white/10 text-gray-300 py-12 mt-20 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Company Info */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="bg-primary/20 p-2 rounded-xl">
                                <Flame className="h-6 w-6 text-primary" />
                            </div>
                            <span className="text-2xl font-bold text-white">FireEye</span>
                        </div>
                        <p className="text-gray-400 mb-4 max-w-md">
                            Next-generation fire safety management platform for modern facilities.
                            Streamline inspections, manage assets, and ensure compliance effortlessly.
                        </p>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                                <Mail className="h-4 w-4 text-primary" />
                                <span>contact@fireeye.com</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                                <Phone className="h-4 w-4 text-primary" />
                                <span>+1 (555) 123-4567</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Product</h3>
                        <ul className="space-y-2">
                            <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="/login" className="hover:text-primary transition-colors">Login</Link></li>
                            <li><Link href="/signup" className="hover:text-primary transition-colors">Sign Up</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                            <li><a href="#contact" className="hover:text-primary transition-colors">Contact</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} FireEye. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
