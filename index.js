'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const { v4: uuidv4 } = require('uuid');

const BUCKET_NAME = 'javascript401d52-bucket';
const MANIFEST_KEY = 'images.json';

exports.handler = async (event) => {
  try {
    // Extract the necessary information from the event object
    const s3Event = event.Records[0].s3;
    const objectKey = s3Event.object.key;

    // Download the images.json file from the S3 bucket if it exists
    let images = [];
    try {
      const manifestData = await s3.getObject({ Bucket: BUCKET_NAME, Key: MANIFEST_KEY }).promise();
      images = JSON.parse(manifestData.Body.toString());
    } catch (error) {
      if (error.code !== 'NoSuchKey') {
        throw error;
      }
    }

    // Get the metadata of the uploaded image
    const metadata = await s3.headObject({ Bucket: BUCKET_NAME, Key: objectKey }).promise();

    // Create a metadata object describing the image
    const imageMetadata = {
      id: uuidv4(),
      name: objectKey,
      size: metadata.ContentLength,
      type: metadata.ContentType,
      lastModified: metadata.LastModified
    };

    // Find if there is an existing image with the same name and update its metadata, otherwise, add the new image to the array
    const existingImageIndex = images.findIndex((image) => image.name === objectKey);
    if (existingImageIndex !== -1) {
      images[existingImageIndex] = imageMetadata;
    } else {
      images.push(imageMetadata);
    }

    // Upload the updated images.json file back to the S3 bucket
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: MANIFEST_KEY,
      Body: JSON.stringify(images),
      ContentType: 'application/json'
    }).promise();

    return { statusCode: 200, body: 'Image metadata updated successfully.' };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: 'An error occurred while updating image metadata.' };
  }
};
