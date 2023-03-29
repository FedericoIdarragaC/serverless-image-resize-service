const sharp = require("sharp");
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { rejects } = require("assert");

const s3 = new AWS.S3();

async function imgResize(buffer, width, height) {
  const resizedBuffer = await sharp(buffer)
    .resize({ width, height })
    .toBuffer()

  return resizedBuffer
}

exports.handler = async (event) => {
  const body = JSON.parse(event.body)
  const { name, image, width, height } = body
  const buffer = Buffer.from(image.split(',')[1], "base64");

  let resizedImage
  try {
    resizedImage = await imgResize(buffer, width, height)
  } catch (error) {
    console.error(`Error uploading ${params.Key} to ${params.Bucket}: ${err.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify(
        {
          message: 'Error resizing image'
        }
      )
    }
  }

  const bucketName = process.env.BUCKET_NAME
  const key = `${name}-${crypto.randomUUID()}`
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: resizedImage,
    ContentEncoding: 'base64',
    ContentType: 'image/png'
  };

  try {
    await s3.putObject(params).promise()
  } catch (error) {
    console.error(`Error uploading ${params.Key} to ${params.Bucket}: ${err.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify(
        {
          message: 'Error uploading image'
        }
      )
    }
  }

  const url = `https://${bucketName}.s3.amazonaws.com/${key}`;

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Resizing Succesfull',
        url
      }
    )
  }
};
