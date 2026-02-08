'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Sparkles, Loader2, Key, CheckCircle, XCircle } from 'lucide-react'
import { LiquidButton } from './Liquid'
import { fetchGeminiModels } from '@/app/actions/ai-config'
import { useToast } from '@/contexts/ToastContext'

interface APISettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function APISettingsModal({ isOpen, onClose }: APISettingsModalProps) {
    const { showToast } = useToast()
    const [apiKey, setApiKey] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [models, setModels] = useState<{name: string, displayName: string}[]>([])
    const [loading, setLoading] = useState(false)
    const [useCustomSettings, setUseCustomSettings] = useState(false)
    const [verified, setVerified] = useState(false)

    // Load from local storage on mount
    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem('fireeye_api_settings')
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    setApiKey(parsed.apiKey || '')
                    setSelectedModel(parsed.model || '')
                    setUseCustomSettings(parsed.useCustom || false)
                    if (parsed.apiKey) {
                        // Optimistic verification if key exists
                        setVerified(true)
                    }
                } catch (e) {
                    console.error('Failed to parse settings', e)
                }
            }
        }
    }, [isOpen])

    const handleVerify = async () => {
        if (!apiKey) return showToast('Please enter an API Key', 'error')

        setLoading(true)
        setVerified(false)
        try {
            const result = await fetchGeminiModels(apiKey)
            if (result.error) {
                throw new Error(result.error)
            }
            if (result.models) {
                setModels(result.models)
                setVerified(true)
                showToast('API Key Validated! Models fetched.', 'success')
                
                // Set default model if none selected
                if (!selectedModel && result.models.length > 0) {
                    const preferred = result.models.find((m: {name: string}) => m.name.includes('flash-lite')) || result.models[0]
                    setSelectedModel(preferred.name)
                }
            }
        } catch (error: any) {
            showToast(error.message || 'Validation Failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = () => {
        if (useCustomSettings && !apiKey) {
            return showToast('API Key required if custom settings are enabled', 'error')
        }

        const settings = {
            apiKey,
            model: selectedModel,
            useCustom: useCustomSettings
        }

        localStorage.setItem('fireeye_api_settings', JSON.stringify(settings))
        showToast('API Settings Saved', 'success')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Settings className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold">API Configuration</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <XCircle className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                        <div>
                            <p className="font-bold text-sm">Use Custom API Key</p>
                            <p className="text-xs text-gray-500">Override system defaults with yours</p>
                        </div>
                        <button 
                            onClick={() => setUseCustomSettings(!useCustomSettings)}
                            className={`w-12 h-6 rounded-full transition-colors p-1 ${useCustomSettings ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${useCustomSettings ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {useCustomSettings && (
                        <div className="space-y-4 animate-fade-in-down">
                            {/* API Key Input */}
                            <div>
                                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Google Gemini API Key</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => {
                                            setApiKey(e.target.value)
                                            setVerified(false)
                                        }}
                                        placeholder="AIzaSy..."
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Your key is stored locally in your browser.
                                </p>
                            </div>

                            {/* Verify Button */}
                            <button
                                onClick={handleVerify}
                                disabled={loading || !apiKey}
                                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                    verified 
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                        : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                                }`}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : verified ? <CheckCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                {loading ? 'Verifying...' : verified ? 'Verified & Models Loaded' : 'Verify & Fetch Models'}
                            </button>

                            {/* Model Selection */}
                            <div className={`transition-all duration-300 ${verified ? 'opacity-100 max-h-[200px]' : 'opacity-50 max-h-0 overflow-hidden'}`}>
                                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Select Model</label>
                                <select 
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm appearance-none"
                                >
                                    <option value="" disabled>Select a model...</option>
                                    {models.map(m => (
                                        <option key={m.name} value={m.name}>
                                            {m.displayName} ({m.name})
                                        </option>
                                    ))}
                                    {/* Fallback option if fetch hasn't happened yet but verify was cached */}
                                    {models.length === 0 && selectedModel && (
                                        <option value={selectedModel}>{selectedModel}</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <LiquidButton onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                    </LiquidButton>
                </div>
            </div>
        </div>
    )
}
