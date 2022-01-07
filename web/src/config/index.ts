// Your Firebase Web App config
export const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  ...(process.env.REACT_APP_FIREBASE_DATABASE_URL && {
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  }),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  ...(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID && {
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  }),
};

// Your Firebase Web App config
export const AWS_CONFIG = {
  Auth: {
    identityPoolId: process.env.REACT_APP_AWS_COGNITO_IDENTITY_POOL_ID,
    region: process.env.REACT_APP_AWS_PROJECT_REGION,
    userPoolId: process.env.REACT_APP_AWS_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_AWS_USER_POOL_WEB_CLIENT_ID,
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_AWS_S3_BUCKET,
      region: process.env.REACT_APP_AWS_PROJECT_REGION,
    },
  },
  aws_appsync_graphqlEndpoint:
    process.env.REACT_APP_AWS_APPSYNC_GRAPHQL_ENDPOINT,
  aws_appsync_region: process.env.REACT_APP_AWS_PROJECT_REGION,
  aws_appsync_authenticationType: 'API_KEY',
  aws_appsync_apiKey: process.env.REACT_APP_AWS_APPSYNC_APIKEY,
};

// Your app name
export const APP_NAME = 'Related:Chat';

// The default theme of the web app
export const DEFAULT_THEME = 'theme01';

// The number of files in the `public/stickers` folder
export const STICKERS_COUNT = 78;

// The number of files in the `public/themes` folder
export const THEMES_COUNT = 60;

// The max number of characters a message can have
export const MESSAGE_MAX_CHARACTERS = 12000;

// The number of messages per "page" (pagination)
export const MESSAGES_PER_PAGE = 30;

// Use email fast sign in (DEVELOPMENT ONLY)
export const FAKE_EMAIL = true;

// The client version number. PLEASE DO NOT CHANGE THIS NUMBER.
export const CLIENT_VERSION = '1.1.0';
