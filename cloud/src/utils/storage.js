const { s3 } = require("../utils");
const path = require("path");
const os = require("os");
const fs = require("fs");
const sharp = require("sharp");
const sizeOf = require("image-size");
const ffmpeg_static = require("ffmpeg-static");
const ffprobe = require("ffprobe-static");
const ffmpeg = require("fluent-ffmpeg");
const mime = require("mime");
const {
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { MAX_FILE_SIZE_MB, AWS_S3_BUCKET } = require("../config");

const storageBucket = AWS_S3_BUCKET;

// const streamToString = async (stream) => {
//   return await new Promise((resolve, reject) => {
//     const chunks = [];
//     stream.on("data", (chunk) => chunks.push(chunk));
//     stream.on("error", reject);
//     stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
//   });
// };

const convertBytesToMegaBytes = (bytes) => {
  return bytes / 1024 / 1024;
};

const getMediaType = (metadata) => {
  return metadata.ContentType.split("/")[0];
};

const ffmpegSync = (originalFile, modifiedFile) => {
  return new Promise((resolve, reject) => {
    ffmpeg(originalFile)
      .setFfmpegPath(ffmpeg_static)
      .screenshot(
        {
          timemarks: [1],
          filename: modifiedFile,
        },
        os.tmpdir()
      )
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(new Error(err));
      });
  });
};

const ffprobeSync = (originalFile) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .setFfprobePath(ffprobe.path)
      .input(originalFile)
      .ffprobe((err, metadata) => {
        if (err) reject(err);
        resolve(metadata.streams[0]);
      });
  });
};

const extractFileNameWithoutExtension = (filePath, ext) => {
  return path.basename(filePath, ext);
};

const getFileMetadata = async (filePath) => {
  const data = await s3.send(
    new HeadObjectCommand({
      Bucket: storageBucket,
      Key: filePath,
    })
  );
  return data;
};

const createPersistentDownloadUrlWithMetadata = async (filePath) => {
  if (!filePath) return ["", null];
  const metadata = await getFileMetadata(filePath);
  return [createPersistentDownloadUrl(storageBucket, filePath), metadata];
};

const deleteFile = async (filePath) => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: storageBucket,
      Key: filePath,
    })
  );
};

/**
 * @param  {string} filePath
 * @param  {number} width
 * @param  {number} height
 * @param  {any} metadata
 * @param  {boolean} allowVideo
 * @param  {boolean} allowAudio
 * @param  {boolean} resizeOriginal
 * @param  {boolean} resizeOriginalSize
 * @return {any}
 */
const saveImageThumbnail = async (
  filePath,
  width,
  height,
  metadata,
  allowVideo = false,
  allowAudio = false,
  resizeOriginal = false,
  resizeOriginalSize = null
) => {
  let fileDeleted = false;
  try {
    if (!filePath) return ["", null];
    if (convertBytesToMegaBytes(metadata.ContentLength) > MAX_FILE_SIZE_MB)
      return ["", null];

    if (getMediaType(metadata) === "video" && !allowVideo)
      throw new Error("Video file is not allowed");

    if (getMediaType(metadata) === "audio" && !allowAudio)
      throw new Error("Audio file is not allowed");

    if (!["image", "video", "audio"].includes(getMediaType(metadata)))
      return ["", null];

    const originalFile = path.join(os.tmpdir(), path.basename(filePath));
    const fileDir = path.dirname(filePath);
    const fileExtension = path.extname(filePath);
    const fileNameWithoutExtension = extractFileNameWithoutExtension(
      filePath,
      fileExtension
    )
      .replace("_photo", "")
      .replace("_file", "");

    const data = await s3.send(
      new GetObjectCommand({
        Bucket: storageBucket,
        Key: filePath,
      })
    );
    await new Promise((resolve, reject) => {
      data.Body.pipe(fs.createWriteStream(originalFile))
        .on("error", (err) => reject(err))
        .on("close", () => resolve());
    });
    // fs.writeFileSync(originalFile, await streamToString(data.Body));

    const thumbnailFile = path.join(
      os.tmpdir(),
      `${fileNameWithoutExtension}_thumbnail.jpeg`
    );

    // START - Only used for original image resizing
    const originalFileResized = path.join(
      os.tmpdir(),
      `${fileNameWithoutExtension}_resized.jpeg`
    );
    let originalFileResizedURL = "";
    // END - Only used for original image resizing

    let fileMetadata;

    if (getMediaType(metadata) === "video") {
      // Video thumbnail
      fileMetadata = await ffprobeSync(originalFile);
      await ffmpegSync(
        originalFile,
        `${fileNameWithoutExtension}_thumbnail.png`
      );
      await sharp(`${os.tmpdir()}/${fileNameWithoutExtension}_thumbnail.png`)
        .resize(width, height)
        .jpeg()
        .toFile(thumbnailFile);
      fs.unlinkSync(`${os.tmpdir()}/${fileNameWithoutExtension}_thumbnail.png`);
    } else if (getMediaType(metadata) === "audio") {
      // Audio thumbnail
      fileMetadata = await ffprobeSync(originalFile);
      fs.unlinkSync(originalFile);
      return ["", fileMetadata];
    } else {
      // Image thumbnail
      fileMetadata = sizeOf(originalFile);
      if (fileMetadata.width <= width) {
        fs.unlinkSync(originalFile);
        return ["", fileMetadata];
      }
      await sharp(originalFile)
        .resize(width, height)
        .jpeg()
        .toFile(thumbnailFile);

      // START - Only used for original image resizing
      if (resizeOriginal && fileMetadata.width > resizeOriginalSize) {
        await sharp(originalFile)
          .resize(resizeOriginalSize, resizeOriginalSize)
          .jpeg()
          .toFile(originalFileResized);
        await deleteFile(filePath);
        fileDeleted = true;
        originalFileResizedURL = await uploadFile(
          `${fileDir}/${fileNameWithoutExtension}.jpeg`,
          originalFileResized
        );
      }
      // END - Only used for original image resizing
    }

    const thumbnailURL = await uploadFile(
      `${fileDir}/${fileNameWithoutExtension}_thumbnail.jpeg`,
      thumbnailFile
    );

    if (fs.existsSync(originalFile)) fs.unlinkSync(originalFile);
    if (fs.existsSync(thumbnailFile)) fs.unlinkSync(thumbnailFile);
    if (fs.existsSync(originalFileResized)) fs.unlinkSync(originalFileResized);

    return [thumbnailURL, fileMetadata, originalFileResizedURL];
  } catch (err) {
    if (filePath && !fileDeleted) await deleteFile(filePath);
    throw err;
  }
};

const uploadFile = async (path, file) => {
  const fileContent = fs.readFileSync(file);
  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: path,
      Body: fileContent,
      CacheControl: "private,max-age=31536000",
      ContentType: mime.getType(file),
    })
  );
  return createPersistentDownloadUrl(storageBucket, path);
};

const createPersistentDownloadUrl = (bucket, pathToFile) => {
  return `https://s3.amazonaws.com/${bucket}/${encodeURIComponent(pathToFile)}`;
};

module.exports = {
  deleteFile,
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
};
