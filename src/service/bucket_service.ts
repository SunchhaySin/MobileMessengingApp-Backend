import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3_client.ts"

export async function uploadProfileImage(
  userId: string,
  file: Express.Multer.File
) {
  console.log("mimetype:", file.mimetype, "size:", file.size, "body", file.buffer);

  if (!file.mimetype.startsWith("image/")) {
    throw new Error("Invalid file type");
  }

  const imageKey = `profiles/${userId}-${Date.now()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: imageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return imageKey;
}

export async function deleteProfileImage(imageKey: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: imageKey,
    })
  );
}