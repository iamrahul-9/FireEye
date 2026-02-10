'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, User, Flame, Sparkles, Bot } from 'lucide-react' // Added Bot
import { chatWithMarshal } from '@/app/actions/chat' // Renamed in file, but import might still be chatWithMarshal or I need to update export?
// Wait, I didn't rename the export in actions/chat.ts, I just changed the logic. 
// Export is still `chatWithMarshal`. I should probably rename it to `chatWithCopilot` consistency, but let's stick to working code first.
// Actually, I can rename it in the import alias if I want, but let's just use it.
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useCopilot } from '@/contexts/CopilotContext'
import { usePathname } from 'next/navigation'

// Simple Markdown renderer style
const MarkdownComponents = {
    p: ({ children }: any) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="mb-0.5">{children}</li>,
    strong: ({ children }: any) => <span className="font-bold text-slate-800 dark:text-slate-200">{children}</span>,
}

type Message = {
    role: 'user' | 'model'
    parts: string
}

export default function FireEyeCopilot() {
    const { inspectionData, isChatOpen, setIsChatOpen } = useCopilot()
    const pathname = usePathname()
    
    // Local state for messages
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', parts: "Hi! I'm FireEye Copilot 🔥. How can I help you regarding fire safety or this platform?" }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isOffline, setIsOffline] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isChatOpen])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg: Message = { role: 'user', parts: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            // Get Config
            let aiConfig = undefined
            const stored = localStorage.getItem('fireeye_api_settings')
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.useCustom && parsed.apiKey) {
                    aiConfig = { apiKey: parsed.apiKey, model: parsed.model }
                }
            }
 
            // Pass context data
            const contextData = inspectionData || null
            const pageContext = pathname?.split('/').pop() || 'Dashboard' // Simple page name derivation

            const response = await chatWithMarshal([...messages, userMsg], contextData, aiConfig, pathname)

            // Track if we're in fallback/offline mode
            if ('fallback' in response && response.fallback) {
                setIsOffline(true)
            }

            if ('error' in response && response.error) {
                setMessages(prev => [...prev, { role: 'model', parts: `⚠️ ${response.error}` }])
            } else if (response.text) {
                setMessages(prev => [...prev, { role: 'model', parts: response.text }])
            }
        } catch {
            setMessages(prev => [...prev, { role: 'model', parts: "⚠️ Connection error. Please try again." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            
            {/* Chat Window - Liquid Glass Theme */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto liquid-card w-80 sm:w-96 overflow-hidden flex flex-col mb-4 ring-1 ring-black/5"
                        style={{ maxHeight: '600px', height: '70vh' }}
                    >
                        {/* Header - Minimalist Glass */}
                        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full border border-zinc-200 dark:border-zinc-700">
                                    <MessageCircle className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm tracking-wide text-zinc-900 dark:text-white">FireEye Copilot</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOffline ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                                        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                            {isOffline ? 'Offline Mode' : inspectionData ? 'Context: Active' : 'Online'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsChatOpen(false)}
                                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages - Transparent Background */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            {messages.map((msg, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border
                                        ${msg.role === 'user' 
                                            ? 'bg-white dark:bg-white/10 border-gray-200 dark:border-white/10' 
                                            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-500/20'}
                                    `}>
                                        {msg.role === 'user' 
                                            ? <User className="w-4 h-4 text-gray-600 dark:text-gray-300" /> 
                                            : <Flame className="w-4 h-4 text-orange-500" />
                                        }
                                    </div>
                                    <div className={`
                                        rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-sm leading-relaxed backdrop-blur-sm
                                        ${msg.role === 'user' 
                                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-tr-none' // FireEye Theme for User
                                            : 'bg-white/60 dark:bg-black/40 border border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-tl-none'}
                                    `}>
                                         <ReactMarkdown components={MarkdownComponents}>
                                            {msg.parts}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                     <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-500/20">
                                        <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                                    </div>
                                    <div className="bg-white/60 dark:bg-black/40 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200/50 dark:border-white/10 shadow-sm backdrop-blur-sm">
                                        <div className="flex gap-1.5 py-1">
                                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white/50 dark:bg-black/40 border-t border-gray-200/50 dark:border-white/10 shrink-0 backdrop-blur-md">
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={inspectionData ? "Ask about this inspection..." : "Ask FireEye Copilot..."}
                                    className="flex-1 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-orange-500/20 shrink-0 hover:scale-105 active:scale-95"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button - Compact Liquid Glass */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="pointer-events-auto backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-orange-500/20 w-14 h-14 rounded-full flex items-center justify-center transition-all group relative overflow-hidden"
            >
                <div className="relative w-full h-full flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                        animate={{ 
                            opacity: isChatOpen ? 1 : 0, 
                            rotate: isChatOpen ? 0 : -90, 
                            scale: isChatOpen ? 1 : 0.5 
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <X className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 1, rotate: 0, scale: 1 }}
                        animate={{ 
                            opacity: isChatOpen ? 0 : 1, 
                            rotate: isChatOpen ? 90 : 0, 
                            scale: isChatOpen ? 0.5 : 1 
                        }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <MessageCircle className="w-7 h-7 text-zinc-700 dark:text-zinc-200" />
                    </motion.div>
                </div>
            </motion.button>
        </div>
    )
}
