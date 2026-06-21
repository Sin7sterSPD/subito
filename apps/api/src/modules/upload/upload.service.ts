import { randomUUID } from "node:crypto"
import { BadRequestError } from "@/lib/errors"
import { putObject, getPublicUrl } from "@/lib/storage"

const MAX_SIZE = 5 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
}

function mimeToExtension(mime: string): string | undefined {
  return MIME_TO_EXT[mime]
}

export async function uploadImage(userId: string, file: File) {
  if (!file.type || !file.type.startsWith("image/")) {
    throw new BadRequestError("Only image files are allowed")
  }

  if (file.size > MAX_SIZE) {
    throw new BadRequestError("File size exceeds 5MB limit")
  }

  const extension = mimeToExtension(file.type)
  if (!extension) {
    throw new BadRequestError(`Unsupported image type: ${file.type}`)
  }

  const filename = `${userId}/${randomUUID()}.${extension}`

  const buffer = new Uint8Array(await file.arrayBuffer())

  await putObject(filename, buffer, file.type)
  const url = getPublicUrl(filename)

  return {
    url,
    filename,
    contentType: file.type,
    size: file.size,
  }
}
