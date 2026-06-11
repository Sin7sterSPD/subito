import { apiClient } from "../api-client"

interface UploadResponse {
  url: string
  filename?: string
  contentType?: string
  size?: number
}

export const uploadApi = {
  uploadImage: async (
    uri: string,
    fileName?: string
  ): Promise<string | null> => {
    const formData = new FormData()
    const name = fileName || `profile_${Date.now()}.jpg`

    formData.append("file", {
      uri,
      name,
      type: "image/jpeg",
    } as unknown as Blob)

    const response = await apiClient.upload<UploadResponse>(
      "/upload/image",
      formData
    )

    if (response.success && response.data) {
      return response.data.url || null
    }

    return null
  },
}
