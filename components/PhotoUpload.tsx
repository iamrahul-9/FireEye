'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera, X, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react'
import FireEyeLoader from '@/components/FireEyeLoader'
import { useToast } from '@/contexts/ToastContext'
import { compressImage } from '@/lib/imageCompression'
import { analyzeImage } from '@/app/actions/analyzeImage'

interface PhotoUploadProps {
    onUpload: (url: string) => void
    currentUrl?: string
    label?: string
    required?: boolean
    onAnalyze?: (result: string) => void
}

export default function PhotoUpload({ onUpload, currentUrl, label = "Upload Photo", required = false, onAnalyze }: PhotoUploadProps) {
    const { showToast } = useToast()
    const [uploading, setUploading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)

    const handleAnalyze = async () => {
        if (!currentUrl || !onAnalyze) return
        
        setAnalyzing(true)
        try {
            const result = await analyzeImage(currentUrl)
            if (result.error) {
                showToast(result.error, 'error')
            } else if (result.text) {
                onAnalyze(result.text)
                showToast('Image analyzed successfully', 'success')
            }
        } catch (error) {
            console.error(error)
            showToast('Failed to analyze image', 'error')
        } finally {
            setAnalyzing(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return
        }

        let file = e.target.files[0]
        setUploading(true)
        let finalUrl = ''

        try {
            // 1. Compress Image
            const compressedBlob = await compressImage(file, 1080, 0.7)
            file = new File([compressedBlob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
            })

            // 2. Cloudinary Upload Strategy
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

            if (cloudName && uploadPreset) {
                const formData = new FormData()
                formData.append('file', file)
                formData.append('upload_preset', uploadPreset)

                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                })

                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error?.message || 'Cloudinary upload failed')
                }

                const data = await res.json()
                finalUrl = data.secure_url
                onUpload(finalUrl)
                showToast('Photo uploaded to Cloud', 'success')
            } else {
                // 3. Fallback: Supabase Storage
                const fileExt = 'jpg'
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('inspection-photos')
                    .upload(filePath, file)

                if (uploadError) {
                    if (uploadError.message.includes('Bucket not found')) {
                        throw new Error('Storage bucket "inspection-photos" not found. Please contact admin.')
                    }
                    throw uploadError
                }

                const data = supabase.storage.from('inspection-photos').getPublicUrl(filePath)
                finalUrl = data.data.publicUrl
                onUpload(finalUrl)
                showToast('Photo uploaded successfully', 'success')
            }



        } catch (error: any) {
            console.error('Upload error:', error)
            showToast(error.message || 'Failed to upload photo', 'error')
        } finally {
            setUploading(false)
        }
    }

    if (currentUrl) {
        return (
            <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg max-w-fit">
                <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="relative group block w-10 h-10 overflow-hidden rounded-md bg-gray-200">
                    <img src={currentUrl} alt="Inspection Proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                </a>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Photo Attached</span>
                    <button
                        onClick={() => onUpload('')}
                        className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                    >
                        <X className="h-3 w-3" /> Remove
                    </button>
                    

                </div>
            </div>
        )
    }

    return (
        <div className="relative">
            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id={`photo-upload-${Math.random()}`} // unique id hack not great for SSR but fine for client
            />
            <label
                // Use a label wrapping logic or just duplicate ID matching
                // Actually, let's just trigger click via ref or use strict label association
                onClick={(e) => {
                    // Find sibling input
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement
                    if (input) input.click()
                }}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed cursor-pointer transition-all
                    ${required
                        ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-gray-300'
                    }
                `}
            >
                {uploading ? (
                    <>
                        <FireEyeLoader size="xs" />
                        <span className="text-xs font-bold">Uploading...</span>
                    </>
                ) : (
                    <>
                        <Camera className="h-3 w-3" />
                        <span className="text-xs font-bold">{label} {required && '*'}</span>
                    </>
                )}
            </label>
        </div>
    )
}
