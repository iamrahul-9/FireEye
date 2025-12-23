/**
 * Compresses an image file using HTML5 Canvas.
 * @param file The original File object
 * @param maxWidth Maximum width of the output image (default 1080px)
 * @param quality JPEG quality (0 to 1, default 0.7)
 * @returns Promise<Blob> Compressed Blob
 */
export async function compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Resize if needed
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width)
                    width = maxWidth
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height)

                // Convert to Blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'))
                        }
                    },
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
    })
}
