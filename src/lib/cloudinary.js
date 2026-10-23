const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function uploadToCloudinary(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!CLOUD || !PRESET) {
      return reject(new Error('Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env and restart.'))
    }
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve({ url: data.secure_url, publicId: data.public_id })
      else reject(new Error(data.error?.message || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading.'))
    xhr.send(form)
  })
}
