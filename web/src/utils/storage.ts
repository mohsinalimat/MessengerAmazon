import { Storage } from 'aws-amplify';
import mime from 'mime-types';

Storage.configure({
  customPrefix: {
    public: '',
  },
});

export const handleUploadFiles = (
  file: File,
  path: string,
  addExtension = true
): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file) resolve('');
    const filePath = addExtension
      ? `${path}.${mime.extension(file.type)}`
      : path;
    Storage.put(filePath, file, {
      cacheControl: 'private,max-age=31536000',
      contentType: file.type,
    })
      .then(() => {
        resolve(filePath);
      })
      .catch((err) => {
        console.error(err.message);
        reject(new Error());
      });
  });
