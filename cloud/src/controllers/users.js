// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  USER_THUMBNAIL_WIDTH,
  USER_PHOTO_MAX_WIDTH,
  AWS_USER_POOL_ID,
  AWS_USER_POOL_WEB_CLIENT_ID,
} = require("../config");
const { sha256, cognito } = require("../utils");
const { getChannelById } = require("../utils/channels");
const {
  getDetailById,
  mutateDetailById,
  createDetail: createDetailDB,
} = require("../utils/details");
const { getDirectById } = require("../utils/directs");
const {
  createPresenceDB,
  mutatePresenceById,
  getPresenceById,
} = require("../utils/presence");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");
const { createUserDB, mutateUserById } = require("../utils/users");
const {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminUpdateUserAttributesCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: AWS_USER_POOL_ID,
        Username: email,
        MessageAction: "SUPPRESS", // Do not send welcome email
        TemporaryPassword: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
          {
            // Don't verify email addresses
            Name: "email_verified",
            Value: "true",
          },
          {
            Name: "name",
            Value: name,
          },
        ],
      })
    );
    const uid = user.User.Username;

    const data = await cognito.send(
      new AdminInitiateAuthCommand({
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        ClientId: AWS_USER_POOL_WEB_CLIENT_ID,
        UserPoolId: AWS_USER_POOL_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );

    await cognito.send(
      new AdminRespondToAuthChallengeCommand({
        ChallengeName: "NEW_PASSWORD_REQUIRED",
        ClientId: AWS_USER_POOL_WEB_CLIENT_ID,
        UserPoolId: AWS_USER_POOL_ID,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: password,
        },
        Session: data.Session,
      })
    );

    await createUserDB({
      objectId: uid,
      fullName: name,
      displayName: name,
      email,
      phoneNumber: "",
      title: "",
      theme: "",
      photoURL: "",
      thumbnailURL: "",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      workspaces: [],
    });

    await createPresenceDB({
      objectId: uid,
      lastPresence: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    res.locals.data = {
      uid,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password, refreshToken } = req.body;

    if (refreshToken) {
      const user = await cognito.send(
        new AdminInitiateAuthCommand({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: AWS_USER_POOL_WEB_CLIENT_ID,
          UserPoolId: AWS_USER_POOL_ID,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        })
      );
      res.locals.data = user.AuthenticationResult;
      return next();
    }

    const user = await cognito.send(
      new AdminInitiateAuthCommand({
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        ClientId: AWS_USER_POOL_WEB_CLIENT_ID,
        UserPoolId: AWS_USER_POOL_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      })
    );
    res.locals.data = user.AuthenticationResult;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const updateUser = async (req, res, next) => {
  try {
    const { photoPath, fullName, displayName, title, phoneNumber, theme } =
      req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    if (displayName === "") throw new Error("Display name must be provided.");
    if (fullName === "") throw new Error("Full name must be provided.");
    if (photoPath && !photoPath.startsWith(`User/${uid}`))
      throw new Error("Not allowed.");

    const [photoURL, metadata] = await createPersistentDownloadUrlWithMetadata(
      photoPath
    );
    const [thumbnailURL, , photoResizedURL] = await saveImageThumbnail(
      photoPath,
      USER_THUMBNAIL_WIDTH,
      USER_THUMBNAIL_WIDTH,
      metadata,
      false,
      false,
      true,
      USER_PHOTO_MAX_WIDTH
    );

    if (displayName) {
      await cognito.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: AWS_USER_POOL_ID,
          Username: uid,
          UserAttributes: [
            {
              Name: "name",
              Value: displayName,
            },
          ],
        })
      );
    }

    await mutateUserById({
      objectId: uid,
      ...(title != null && { title }),
      ...(photoPath != null && {
        photoURL: photoResizedURL || photoURL,
        thumbnailURL,
      }),
      ...(phoneNumber != null && { phoneNumber }),
      ...(displayName && { displayName }),
      ...(fullName && { fullName }),
      ...(theme && { theme }),
      updatedAt: new Date().toISOString(),
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const updatePresence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    const presence = await getPresenceById(uid);
    if (presence) {
      await mutatePresenceById({
        objectId: uid,
        lastPresence: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await createPresenceDB({
        objectId: uid,
        lastPresence: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const read = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;
    const { chatType, chatId } = req.body;

    if (id !== uid) throw new Error("Not allowed.");

    const detailId = sha256(`${uid}#${chatId}`);

    const detail = await getDetailById(detailId);

    const chat =
      chatType === "Channel"
        ? await getChannelById(chatId)
        : await getDirectById(chatId);

    if (detail && uid !== detail.userId) throw new Error("Not allowed.");
    if (detail && chatId !== detail.chatId)
      throw new Error("An error has occured.");

    if (detail) {
      await mutateDetailById({
        objectId: detailId,
        lastRead: chat.lastMessageCounter,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await createDetailDB({
        objectId: detailId,
        chatId,
        userId: uid,
        workspaceId: chat.workspaceId,
        lastRead: chat.lastMessageCounter,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createUser,
  loginUser,
  updateUser,
  updatePresence,
  read,
};
