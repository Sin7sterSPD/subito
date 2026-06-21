import "../env"
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { log } from "./logger"
import { InternalError } from "./errors"

const BUCKET = process.env.R2_BUCKET!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
})

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string
) {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    log.info({ key, contentType }, "File uploaded to R2")
  } catch (err) {
    log.error({ err, key }, "Failed to upload file to R2")
    throw new InternalError("Failed to upload file")
  }
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

export async function deleteObject(key: string) {
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    )
    log.info({ key }, "File deleted from R2")
  } catch (err) {
    log.error({ err, key }, "Failed to delete file from R2")
    throw new InternalError("Failed to delete file")
  }
}
