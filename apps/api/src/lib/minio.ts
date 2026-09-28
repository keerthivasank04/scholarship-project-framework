import * as Minio from 'minio'
import { logger } from './logger'

const clean = (val?: string) => (val ? val.trim().replace(/[\r\n\t]/g, '') : undefined)

export const BUCKET = clean(process.env.MINIO_BUCKET) || 'scholarship-docs'

const endpoint = clean(process.env.MINIO_ENDPOINT) || 'localhost'
const accessKey = clean(process.env.MINIO_ACCESS_KEY) || 'minioadmin'
const secretKey = clean(process.env.MINIO_SECRET_KEY) || 'minioadmin'
const port = parseInt(clean(process.env.MINIO_PORT) || '9000', 10)
const useSSL = process.env.MINIO_USE_SSL === 'true'

export const minioClient = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey,
  secretKey,
})

/** Ensure the bucket exists (safe at startup, won't crash the server if storage is unreachable) */
export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET, clean(process.env.MINIO_REGION) || 'ap-south-1')
      logger.info(`MinIO bucket "${BUCKET}" created.`)
    } else {
      logger.info(`MinIO bucket "${BUCKET}" ready.`)
    }
  } catch (err: any) {
    logger.warn(`MinIO storage check warning: ${err.message}. File uploads may fail until valid storage credentials are provided.`)
  }
}
