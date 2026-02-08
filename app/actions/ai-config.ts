'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function fetchGeminiModels(apiKey: string) {
    if (!apiKey) {
        return { error: 'API Key is required' }
    }

    try {
        // The Node SDK doesn't always expose listModels directly in older versions, 
        // but let's try the standard REST endpoint approach if SDK fails, 
        // or just return a static list if we can't fetch. 
        // Actually, checking the SDK docs, genAI.getGenerativeModel is for getting a model, 
        // managing models usually requires a different manager or REST call.
        // For simplicity and robustness in this specific "Flash" context, 
        // we can try to "test" the key with a lightweight call or just trust it.
        // HOWEVER, the user specifically asked for a DROPDOWN of available models.
        
        // Let's use the REST API for listing models as it's most reliable without extra deps.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`)
        }

        const data = await response.json()
        
        // Filter for Gemini models that generate content
        const models = (data.models || [])
            .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({
                name: m.name.replace('models/', ''),
                displayName: m.displayName,
                description: m.description
            }))
            .sort((a: any, b: any) => b.name.localeCompare(a.name)) // Newest first roughly

        return { models }

    } catch (error: any) {
        console.error('Error fetching models:', error)
        return { error: error.message || 'Failed to validate API Key' }
    }
}
