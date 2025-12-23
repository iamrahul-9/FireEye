'use client'

import Link from 'next/link'
import { isValidEmail } from '@/lib/utils'
import {
  CheckCircle, Flame, Shield, BarChart3, QrCode,
  FileText, Sparkles, ArrowRight, Check, Mail
} from 'lucide-react'
import LandingNav from '@/components/LandingNav'
import Footer from '@/components/Footer'
import { useToast } from '@/contexts/ToastContext'
import { useState } from 'react'

export default function LandingPage() {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})
  const { showToast } = useToast()

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}

    if (!contactForm.name.trim()) newErrors.name = 'Please enter your name'
    if (!isValidEmail(contactForm.email)) newErrors.email = 'Please enter a valid email address'
    if (!contactForm.message.trim()) newErrors.message = 'Please enter your message'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    // Simulate submission
    showToast("Message Sent! We'll get back to you shortly.", 'success')
    setContactForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <LandingNav />

      {/* Global Ambient Lens Effects - Fixed Overlay (Z-0) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* 1. SOLID BLACK BACKGROUND */}
        <div className="absolute inset-0 bg-black" />

        {/* 2. BASE GLOW (Subtle) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black z-[1]" />

        {/* 3. LENS GLARES (Restored Vibrancy & 50% Opacity for Visibility) */}
        <div className="z-[2] relative w-full h-full opacity-50 mix-blend-screen">
          {/* Top Left - Orange */}
          <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-orange-600/40 rounded-full blur-[120px] animate-float" />

          {/* Bottom Right - Blue */}
          <div className="absolute bottom-[-20%] right-[-10%] w-[80vw] h-[80vw] bg-blue-600/40 rounded-full blur-[120px] animate-float-delayed" />

          {/* Center - Purple Haze */}
          <div className="absolute top-[30%] left-[20%] w-[60vw] h-[60vw] bg-indigo-600/30 rounded-full blur-[150px] animate-pulse" />

          {/* Bottom Left - Ember Glow */}
          <div className="absolute bottom-[-10%] left-[-20%] w-[60vw] h-[60vw] bg-orange-700/40 rounded-full blur-[130px] animate-float" />

          {/* Top Right - Cyan Glow */}
          <div className="absolute top-[-10%] right-[-20%] w-[60vw] h-[60vw] bg-cyan-600/40 rounded-full blur-[130px] animate-float-delayed" />
        </div>
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
        {/* Background Effects */}
        {/* Background Effects with Parallax */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 z-0 pointer-events-none select-none overflow-hidden"
        >
          {/* Abstract Fire Safety Aesthetic */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-600/10 to-transparent rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-20 blur-3xl" />
        </div>

        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-float-delayed" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
            Fire Safety Management,
            <span className="text-primary block mt-2">Reimagined</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Streamline inspections, manage assets, and ensure compliance with our next-generation platform built for modern facilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="liquid-button flex items-center gap-2 text-lg px-8 py-4 bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 text-primary" // Manual glass override for Hero if needed, or just liquid-button
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 rounded-full border-2 border-white/10 text-gray-300 font-medium hover:border-primary hover:text-primary transition-all"
            >
              Learn More
            </Link>
          </div>

          {/* Hero Visual */}
          <div className="mt-20 liquid-card p-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 aspect-square flex items-center justify-center">
                <Flame className="h-16 w-16 text-white" />
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 aspect-square flex items-center justify-center">
                <Shield className="h-16 w-16 text-white" />
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 aspect-square flex items-center justify-center">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features designed to make fire safety management effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Asset Management',
                description: 'Track all fire safety equipment with detailed records, QR codes, and location mapping.'
              },
              {
                icon: CheckCircle,
                title: 'Smart Inspections',
                description: 'Streamlined digital inspection forms with automatic compliance tracking and alerts.'
              },
              {
                icon: QrCode,
                title: 'QR Code Integration',
                description: 'Generate and scan QR codes for instant asset access and inspection history.'
              },
              {
                icon: FileText,
                title: 'Matrix Reports',
                description: 'Comprehensive floor-wise reporting with PDF export and client filtering.'
              },
              {
                icon: Sparkles,
                title: 'AI Insights',
                description: 'Intelligent summaries and predictive maintenance recommendations.'
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                description: 'Live compliance rates, pending issues, and performance metrics at a glance.'
              }
            ].map((feature, index) => (
              <div key={index} className="liquid-card p-8 hover:scale-105 transition-transform bg-white/5 border-white/10">
                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-400">
              See what our clients say about FireEye
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "FireEye transformed our inspection process. We've cut our compliance time by 70% and have complete visibility across all our properties.",
                author: "Sarah Chen",
                role: "Safety Director, Premier Properties"
              },
              {
                quote: "The QR code feature is a game-changer. Our technicians can access asset history instantly, making inspections faster and more accurate.",
                author: "Michael Rodriguez",
                role: "Operations Manager, SafeGuard Services"
              },
              {
                quote: "Best investment we've made in facility management. The reporting features alone have saved us countless hours every month.",
                author: "Jennifer Park",
                role: "CEO, BuildRight Solutions"
              }
            ].map((testimonial, index) => (
              <div key={index} className="liquid-card p-8 bg-white/5 border-white/10">
                <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-400">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '$49',
                period: '/month',
                description: 'Perfect for small facilities',
                features: [
                  'Up to 50 assets',
                  'Unlimited inspections',
                  'QR code generation',
                  'Basic reporting',
                  'Email support'
                ]
              },
              {
                name: 'Professional',
                price: '$149',
                period: '/month',
                description: 'Most popular for growing teams',
                features: [
                  'Up to 500 assets',
                  'Unlimited inspections',
                  'QR code generation',
                  'Advanced reporting & analytics',
                  'Multi-client support',
                  'AI insights',
                  'Priority support'
                ],
                highlighted: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                description: 'For large organizations',
                features: [
                  'Unlimited assets',
                  'Unlimited inspections',
                  'Custom integrations',
                  'Dedicated account manager',
                  'Advanced security',
                  'SLA guarantee',
                  '24/7 phone support'
                ]
              }
            ].map((plan, index) => (
              <div
                key={index}
                className={`liquid-card p-8 bg-white/5 border-white/10 ${plan.highlighted ? 'ring-2 ring-primary scale-105' : ''}`}
              >
                {plan.highlighted && (
                  <div className="bg-primary text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="liquid-button block text-center w-full"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-400">
              Have questions? We'd love to hear from you.
            </p>
          </div>

          <div className="liquid-card p-8 bg-white/5 border-white/10">
            <form onSubmit={handleContactSubmit} className="space-y-6" noValidate>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name
                </label>
                <div className="w-full">
                  <input
                    type="text"
                    id="name"
                    value={contactForm.name}
                    onChange={(e) => {
                      setContactForm({ ...contactForm, name: e.target.value })
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }))
                    }}
                    className={`liquid-input w-full text-white placeholder-gray-500 ${errors.name ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                    placeholder="Your name"
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in-down flex items-center gap-1.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                      {errors.name}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="w-full">
                  <input
                    type="email"
                    id="email"
                    value={contactForm.email}
                    onChange={(e) => {
                      setContactForm({ ...contactForm, email: e.target.value })
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    className={`liquid-input w-full text-white placeholder-gray-500 ${errors.email ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in-down flex items-center gap-1.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message
                </label>
                <div className="w-full">
                  <textarea
                    id="message"
                    rows={5}
                    value={contactForm.message}
                    onChange={(e) => {
                      setContactForm({ ...contactForm, message: e.target.value })
                      if (errors.message) setErrors(prev => ({ ...prev, message: undefined }))
                    }}
                    className={`liquid-input w-full resize-none text-white placeholder-gray-500 ${errors.message ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                    placeholder="Tell us about your needs..."
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in-down flex items-center gap-1.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="liquid-button w-full flex items-center justify-center gap-2 text-lg py-4"
              >
                <Mail className="h-5 w-5" />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
