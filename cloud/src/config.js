const USER_THUMBNAIL_WIDTH = 60; // Square thumbnail width (60x60)
const WORKSPACE_THUMBNAIL_WIDTH = 60; // Square thumbnail width (60x60)
const MESSAGE_THUMBNAIL_WIDTH = 400; // Auto thumbnail height (400xauto)

const USER_PHOTO_MAX_WIDTH = 300; // Square thumbnail width (300x300)
const WORKSPACE_PHOTO_MAX_WIDTH = 300; // Square thumbnail width (300x300)

// If a media file is larger than this value (in megabytes), then no thumbnail will be generated.
const MAX_FILE_SIZE_MB = 300;

// The newest database version number. PLEASE DO NOT CHANGE THIS NUMBER.
const NEWEST_DB_VERSION = "1.0.2";

// The backend version number. PLEASE DO NOT CHANGE THIS NUMBER.
const BACKEND_VERSION = "1.1.0";

// The backend compatibility. PLEASE DO NOT CHANGE THESE NUMBERS.
const BACKEND_CLIENT_COMPATIBILITY = ["1.0.2", "1.1.0"]; // compatible client versions array
const BACKEND_DATABASE_COMPATIBILITY = ["1.0.2"]; // compatible database versions array

const AWS_PROJECT_REGION = "us-east-1";
const AWS_ACCESS_KEY_ID = process.env.KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.KEY_SECRET;
const AWS_USER_POOL_ID = process.env.AWS_USER_POOL_ID;
const AWS_USER_POOL_WEB_CLIENT_ID = process.env.AWS_USER_POOL_WEB_CLIENT_ID;
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
const AWS_APPSYNC_ENDPOINT = process.env.AWS_APPSYNC_ENDPOINT;
const AWS_APPSYNC_API_KEY = process.env.AWS_APPSYNC_API_KEY;

module.exports = {
  USER_THUMBNAIL_WIDTH,
  WORKSPACE_THUMBNAIL_WIDTH,
  MESSAGE_THUMBNAIL_WIDTH,
  USER_PHOTO_MAX_WIDTH,
  WORKSPACE_PHOTO_MAX_WIDTH,
  MAX_FILE_SIZE_MB,
  BACKEND_VERSION,
  BACKEND_CLIENT_COMPATIBILITY,
  BACKEND_DATABASE_COMPATIBILITY,
  NEWEST_DB_VERSION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_USER_POOL_ID,
  AWS_USER_POOL_WEB_CLIENT_ID,
  AWS_S3_BUCKET,
  AWS_PROJECT_REGION,
  AWS_APPSYNC_API_KEY,
  AWS_APPSYNC_ENDPOINT,
};
