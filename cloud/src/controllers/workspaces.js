// eslint-disable-next-line no-unused-vars
const express = require("express");
const { sha256, cognito } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");
const {
  WORKSPACE_THUMBNAIL_WIDTH,
  WORKSPACE_PHOTO_MAX_WIDTH,
  AWS_USER_POOL_ID,
  AWS_USER_POOL_WEB_CLIENT_ID,
} = require("../config");
const {
  getUserByEmail,
  getUsersByWorkspace,
  createUserDB,
} = require("../utils/users");
const {
  createWorkspace: createWorkspaceDB,
  getWorkspaceById,
  mutateWorkspaceById,
  addUserToWorkspace,
  removeUserFromWorkspace,
} = require("../utils/workspaces");
const {
  removeWorkspaceFromUser,
  addWorkspaceToUser,
} = require("../utils/users");
const {
  createChannel: createChannelDB,
  getChannelById,
  addUserToChannel,
  getChannelsByWorkspace,
  mutateChannelById,
  getChannelsByUser,
  removeUserFromChannel,
} = require("../utils/channels");
const {
  createDirect: createDirectDB,
  getDirectsByUser,
  mutateDirectById,
} = require("../utils/directs");
const { createDetail: createDetailDB } = require("../utils/details");
const {
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { createPresenceDB } = require("../utils/presence");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const promises = [];
    const workspaceId = customObjectId || uuidv4();
    const channelId = uuidv4();
    const directMessageId = uuidv4();

    await createChannelDB({
      objectId: channelId,
      name: "general",
      members: [uid],
      typing: [],
      lastTypingReset: new Date().toISOString(),
      workspaceId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: uid,
      isDeleted: false,
      isArchived: false,
      topic: "",
      details: "",
      lastMessageCounter: 0,
      lastMessageText: "",
    });

    promises.push(
      createDirectDB({
        objectId: directMessageId,
        members: [uid],
        typing: [],
        lastTypingReset: new Date().toISOString(),
        active: [uid],
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailChannelId = sha256(`${uid}#${channelId}`);
    promises.push(
      createDetailDB({
        objectId: detailChannelId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    const detailDmId = sha256(`${uid}#${directMessageId}`);
    promises.push(
      createDetailDB({
        objectId: detailDmId,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    await Promise.all(promises);

    await addWorkspaceToUser(workspaceId, uid);

    await createWorkspaceDB({
      name,
      channelId,
      objectId: workspaceId,
      members: [uid],
      ownerId: uid,
      details: "",
      photoURL: "",
      thumbnailURL: "",
      isDeleted: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    res.locals.data = {
      workspaceId,
      channelId,
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
const updateWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;
    const { photoPath, name, details } = req.body;

    if (name === "") throw new Error("Name must be provided.");
    if (photoPath && !photoPath.startsWith(`Workspace/${workspaceId}`))
      throw new Error("Not allowed.");

    const workspace = await getWorkspaceById(workspaceId);

    if (name && workspace.ownerId !== uid)
      throw new Error("The workspace name can only be renamed by the owner.");

    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    const [photoURL, metadata] = await createPersistentDownloadUrlWithMetadata(
      photoPath
    );
    const [thumbnailURL, , photoResizedURL] = await saveImageThumbnail(
      photoPath,
      WORKSPACE_THUMBNAIL_WIDTH,
      WORKSPACE_THUMBNAIL_WIDTH,
      metadata,
      false,
      false,
      true,
      WORKSPACE_PHOTO_MAX_WIDTH
    );

    await mutateWorkspaceById({
      objectId: workspaceId,
      ...(photoPath != null && {
        photoURL: photoResizedURL || photoURL,
        thumbnailURL,
      }),
      ...(details != null && { details }),
      ...(name && { name }),
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
const deleteWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    await mutateWorkspaceById({
      objectId: workspaceId,
      updatedAt: new Date().toISOString(),
      isDeleted: true,
      members: [],
    });

    // const snapshotDetails = await firestore
    //   .collection("Detail")
    //   .where("workspaceId", "==", workspaceId)
    //   .get();
    // await Promise.all(
    //   snapshotDetails.docs.map(async (doc) => {
    //     await doc.ref.delete();
    //   })
    // );

    const channels = await getChannelsByWorkspace(workspaceId);
    await Promise.all(
      channels.map(async (doc) => {
        await mutateChannelById({
          objectId: doc.objectId,
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        });
      })
    );

    const users = await getUsersByWorkspace(workspaceId);
    await Promise.all(
      users.map(async (doc) => {
        await removeWorkspaceFromUser(workspaceId, doc.objectId);
      })
    );

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
const addTeammate = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    let { objectId: teammateId } = await getUserByEmail(email);
    if (!teammateId) {
      const name = "Guest";
      const password = uuidv4();
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
      teammateId = user.User.Username;

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

      await Promise.all([
        createUserDB({
          objectId: teammateId,
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
        }),
        createPresenceDB({
          objectId: teammateId,
          lastPresence: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }),
      ]);
    }

    const workspace = await getWorkspaceById(workspaceId);
    // if (!workspace.members.includes(uid))
    //   throw new Error("The user is not a member of the workspace.");

    if (workspace.members.includes(teammateId))
      throw new Error(
        "Email is already associated with a user in this workspace."
      );

    const channel = await getChannelById(workspace.channelId);

    await addUserToWorkspace(workspaceId, teammateId, workspace);
    await addWorkspaceToUser(workspaceId, teammateId);
    await addUserToChannel(channel.objectId, teammateId, channel);

    const promises = [];

    // Added by another user than me
    if (uid !== teammateId) {
      const directMessageId = uuidv4();
      promises.push(
        createDirectDB({
          objectId: directMessageId,
          members: [uid, teammateId],
          active: [uid],
          typing: [],
          lastTypingReset: new Date().toISOString(),
          workspaceId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastMessageCounter: 0,
          lastMessageText: "",
        })
      );
      // New teammate chat details with me
      const d2 = sha256(`${teammateId}#${directMessageId}`);
      promises.push(
        createDetailDB({
          objectId: d2,
          chatId: directMessageId,
          userId: teammateId,
          lastRead: 0,
          workspaceId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
      );

      // My chat detail with the new teammate
      const d3 = sha256(`${uid}#${directMessageId}`);
      promises.push(
        createDetailDB({
          objectId: d3,
          chatId: directMessageId,
          userId: uid,
          lastRead: 0,
          workspaceId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
      );
    }

    const selfDirectMessageId = uuidv4();
    promises.push(
      createDirectDB({
        objectId: selfDirectMessageId,
        members: [teammateId],
        active: [teammateId],
        typing: [],
        lastTypingReset: new Date().toISOString(),
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    // New teammate chat details with default channel
    const d1 = sha256(`${teammateId}#${channel.objectId}`);
    promises.push(
      createDetailDB({
        objectId: d1,
        chatId: channel.objectId,
        userId: teammateId,
        lastRead: channel.lastMessageCounter,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    // New teammate chat details with himself
    const d4 = sha256(`${teammateId}#${selfDirectMessageId}`);
    promises.push(
      createDetailDB({
        objectId: d4,
        chatId: selfDirectMessageId,
        userId: teammateId,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    await Promise.all(promises);

    res.locals.data = {
      succes: true,
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
const deleteTeammate = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { uid } = res.locals;

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    await removeWorkspaceFromUser(workspaceId, userId);
    await removeUserFromWorkspace(workspaceId, userId, workspace);

    // const snapshot = await firestore
    //   .collection("Detail")
    //   .where("userId", "==", userId)
    //   .where("workspaceId", "==", workspaceId)
    //   .get();
    // await Promise.all(
    //   snapshot.docs.map(async (doc) => {
    //     await doc.ref.delete();
    //   })
    // );

    const dms = await getDirectsByUser(workspaceId, userId);
    await Promise.all(
      dms.map(async (doc) => {
        await mutateDirectById({
          objectId: doc.objectId,
          members: [],
          active: [],
          updatedAt: new Date().toISOString(),
        });
      })
    );

    const channels = await getChannelsByUser(workspaceId, userId);
    await Promise.all(
      channels.map(async (doc) => {
        await removeUserFromChannel(doc.objectId, userId, doc);
      })
    );

    res.locals.data = {
      succes: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addTeammate,
  deleteTeammate,
};
