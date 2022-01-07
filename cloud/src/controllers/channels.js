// eslint-disable-next-line no-unused-vars
const express = require("express");
const { timeDiff, sha256 } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const { getUserByEmail } = require("../utils/users");
const { getWorkspaceById } = require("../utils/workspaces");
const {
  getChannelById,
  mutateChannelById,
  addUserToChannel,
  removeUserFromChannel,
  createChannel: createChannelDB,
  getChannelsByName,
} = require("../utils/channels");
const { createDetail: createDetailDB } = require("../utils/details");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createChannel = async (req, res, next) => {
  try {
    const { name, details, workspaceId, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not in the workspace.");

    const channels = await getChannelsByName(
      workspaceId,
      name.replace("#", "")
    );
    if (channels.length) throw new Error("Channel already exists.");

    const channelId = customObjectId || uuidv4();
    const promises = [];

    promises.push(
      createChannelDB({
        objectId: channelId,
        name: `${name.replace("#", "")}`,
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
        details: details || "",
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailId = sha256(`${uid}#${channelId}`);
    promises.push(
      createDetailDB({
        objectId: detailId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    await Promise.all(promises);

    res.locals.data = {
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
const updateChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;
    const { topic, details, name } = req.body;

    if (name != null && (name.trim() === "" || name.trim() === "#"))
      throw new Error("Channel name must be provided.");

    const channel = await getChannelById(channelId);

    if (name) {
      const snapshot = await getChannelsByName(
        channel.workspaceId,
        name.trim().replace("#", "")
      );
      if (snapshot.length) throw new Error("Channel name is already taken.");
    }

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await mutateChannelById({
      objectId: channelId,
      ...(topic != null && { topic }),
      ...(details != null && { details }),
      ...(name && { name: name.replace("#", "") }),
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
const deleteChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);
    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await mutateChannelById({
      objectId: channelId,
      updatedAt: new Date().toISOString(),
      isDeleted: true,
    });

    // const snapshot = await firestore
    //   .collection("Detail")
    //   .where("chatId", "==", channelId)
    //   .get();
    // await Promise.all(
    //   snapshot.docs.map(async (doc) => {
    //     await doc.ref.delete();
    //   })
    // );

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
const archiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);
    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await mutateChannelById({
      objectId: channelId,
      updatedAt: new Date().toISOString(),
      isArchived: true,
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
const unarchiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);
    const workspace = await getWorkspaceById(channel.workspaceId);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not in the workspace.");

    await addUserToChannel(channelId, uid, channel, {
      isArchived: false,
    });

    if (!channel.members.includes(uid)) {
      const d1 = sha256(`${uid}#${channel.objectId}`);
      await createDetailDB({
        objectId: d1,
        chatId: channel.objectId,
        userId: uid,
        workspaceId: channel.workspaceId,
        lastRead: channel.lastMessageCounter,
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
const addMember = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { email } = req.body;
    const { uid } = res.locals;

    const { objectId: userId } = await getUserByEmail(email);

    const channel = await getChannelById(channelId);
    const workspace = await getWorkspaceById(channel.workspaceId);

    if (!workspace.members.includes(uid))
      throw new Error("The user is not in this workspace.");

    if (!workspace.members.includes(userId))
      throw new Error("The user is not in this workspace.");

    await addUserToChannel(channelId, userId, channel);

    const d1 = sha256(`${userId}#${channel.objectId}`);
    await createDetailDB({
      objectId: d1,
      chatId: channel.objectId,
      userId,
      workspaceId: channel.workspaceId,
      lastRead: channel.lastMessageCounter,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
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
const deleteMember = async (req, res, next) => {
  try {
    const { id: channelId, userId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);
    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await removeUserFromChannel(channelId, userId);

    // const snapshot = await firestore
    //   .collection("Detail")
    //   .where("chatId", "==", channelId)
    //   .where("userId", "==", userId)
    //   .get();
    // await Promise.all(
    //   snapshot.docs.map(async (doc) => {
    //     await doc.ref.delete();
    //   })
    // );

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
const typingIndicator = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { isTyping } = req.body;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      (isTyping && !channel.typing.includes(uid)) ||
      (!isTyping && channel.typing.includes(uid))
    ) {
      await mutateChannelById({
        objectId: channelId,
        typing: isTyping
          ? [...new Set([...channel.typing, uid])]
          : channel.typing.filter((id) => id !== uid),
        updatedAt: new Date().toISOString(),
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
const resetTyping = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getChannelById(channelId);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      timeDiff(new Date(channel.lastTypingReset), Date.now()) >= 30 &&
      channel.typing.length > 0
    ) {
      await mutateChannelById({
        objectId: channelId,
        typing: [],
        lastTypingReset: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
  createChannel,
  updateChannel,
  deleteChannel,
  archiveChannel,
  unarchiveChannel,
  addMember,
  deleteMember,
  typingIndicator,
  resetTyping,
};
