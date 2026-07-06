import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3_client.ts"

export async function uploadProfileImage(
  userId: string,
  file: Express.Multer.File
) {
  const imageKey = `profiles/${userId}-${Date.now()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: imageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return imageKey;
}