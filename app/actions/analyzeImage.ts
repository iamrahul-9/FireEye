'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

export async function analyzeImage(imageUrl: string, context?: string) {
    if (!process.env.GOOGLE_API_KEY) {
        return { error: 'Google API Key not configured' }
    }

    try {
        // Fetch the image
        const response = await fetch(imageUrl)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = buffer.toString('base64')

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const prompt = `
            You are a fire safety expert analyzing inspection photos.
            Context: ${context || 'Fire safety inspection'}.
            
            Look at the uploaded image and describe the specific defect, issue, or status visible.
            Be concise, professional, and factual. 
            Do not start with "The image shows...". Just state the observation.
            Example: "Extinguisher pressure gauge indicates low pressure (red zone)."
            Example: "Hose reel nozzle is missing."
            Example: "Fire alarm panel shows a fault light."
            
            Keep it under 20 words.
        `

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: response.headers.get('content-type') || 'image/jpeg'
                }
            }
        ])

        const text = result.response.text()
        return { text }

    } catch (error: any) {
        console.error('Gemini Analysis Error:', error)
        return { error: 'Failed to analyze image. Please try again.' }
    }
}
