import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";

const {
  S3_REGION,
  S3_BUCKET_ACCESS_KEY,
  S3_BUCKET_SECRET_KEY,
} = process.env;

if (!S3_REGION || !S3_BUCKET_ACCESS_KEY || !S3_BUCKET_SECRET_KEY) {
  throw new Error("Missing AWS environment variables");
}

export const s3 = new S3Client({
    region: S3_REGION ,
    credentials: {
        accessKeyId: S3_BUCKET_ACCESS_KEY,
        secretAccessKey: S3_BUCKET_SECRET_KEY,
    },
});