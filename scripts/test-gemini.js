// import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("API Key missing!");
        return;
    }
    
    console.log("Fetching available models from API...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
            return;
        }
        
        if (!data.models) {
            console.log("No models returned. Response:", data);
            return;
        }

        console.log("Available Models:");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name}`);
            }
        });
        
    } catch (error) {
        console.error("Network Error:", error.message);
    }
}

listModels();
