import { randomUUID } from "node:crypto"
import { BadRequestError } from "@/lib/errors"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}
const MAX_SIZE = 5 * 1024 * 1024

export async function uploadImage(userId: string, file: File) {
  if (!file.type || !ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError(
      `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`
    )
  }

  if (file.size > MAX_SIZE) {
    throw new BadRequestError("File size exceeds 5MB limit")
  }

  const extension = MIME_TO_EXT[file.type]
  if (!extension) {
    throw new BadRequestError("Unsupported file type")
  }

  const filename = `${userId}/${randomUUID()}.${extension}`

  const url = await mockUpload(file, filename)

  return {
    url,
    filename,
    contentType: file.type,
    size: file.size,
  }
}

async function mockUpload(file: File, filename: string): Promise<string> {
  const STORAGE_BASE_URL =
    process.env.STORAGE_BASE_URL || "https://storage.subito.in"

  return `${STORAGE_BASE_URL}/uploads/${filename}`
}
