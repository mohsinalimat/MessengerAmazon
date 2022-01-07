// eslint-disable-next-line no-unused-vars
const express = require("express");
const { timeDiff, sha256 } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const { getWorkspaceById } = require("../utils/workspaces");
const {
  createDirect: createDirectDB,
  mutateDirectById,
  getDirectsByUser,
  addUsersToDirectActive,
  removeUserFromDirectActive,
  getDirectById,
} = require("../utils/directs");
const { createDetail: createDetailDB } = require("../utils/details");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createDirect = async (req, res, next) => {
  try {
    const { userId, workspaceId } = req.body;
    const { uid } = res.locals;

    const isMe = userId === uid;

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of this workspace");

    const dms = await getDirectsByUser(workspaceId, uid);

    const activeArray = [uid];

    if (isMe) {
      const currentDm = dms.find((dm) => dm.members.length === 1);
      const directMessageId = currentDm ? currentDm.objectId : uuidv4();
      if (currentDm) {
        // Activate the existing direct (a self direct has already been created in the past)
        await mutateDirectById({
          objectId: currentDm.objectId,
          active: activeArray,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create a new direct (no self direct in this workspace before)
        await createDirectDB({
          objectId: directMessageId,
          members: [uid],
          typing: [],
          lastTypingReset: new Date().toISOString(),
          active: activeArray,
          workspaceId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          lastMessageCounter: 0,
          lastMessageText: "",
        });

        const detailDmId = sha256(`${uid}#${directMessageId}`);
        await createDetailDB({
          objectId: detailDmId,
          chatId: directMessageId,
          userId: uid,
          lastRead: 0,
          workspaceId,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      res.locals.data = {
        directId: directMessageId,
      };
      return next();
    }

    // uid wants to send a message to another user than him
    const currentDm = dms.find((dm) => dm.members.includes(userId));

    // Activate the existing direct (a direct between uid and teammateId has been open in the past)
    if (currentDm) {
      await addUsersToDirectActive(currentDm.objectId, activeArray);
      res.locals.data = {
        directId: currentDm.objectId,
      };
      return next();
    }

    // Create a new direct (no direct between these users in this workspace before)
    const promises = [];
    const directMessageId = uuidv4();
    promises.push(
      createDirectDB({
        objectId: directMessageId,
        members: [uid, userId],
        typing: [],
        lastTypingReset: new Date().toISOString(),
        active: activeArray,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const d1 = sha256(`${uid}#${directMessageId}`);
    promises.push(
      createDetailDB({
        objectId: d1,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    const d2 = sha256(`${userId}#${directMessageId}`);
    promises.push(
      createDetailDB({
        objectId: d2,
        chatId: directMessageId,
        userId: userId,
        lastRead: 0,
        workspaceId,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
    );

    res.locals.data = {
      directId: directMessageId,
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
const closeDirect = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    const direct = await getDirectById(id);
    if (!direct.members.includes(uid))
      throw new Error("The user is not a member of this Direct");

    await removeUserFromDirectActive(id, uid, direct);

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
    const { id: dmId } = req.params;
    const { isTyping } = req.body;
    const { uid } = res.locals;

    const direct = await getDirectById(dmId);

    if (!direct.members.includes(uid))
      throw new Error("The user is not in the Direct.");

    if (
      (isTyping && !direct.typing.includes(uid)) ||
      (!isTyping && direct.typing.includes(uid))
    ) {
      await mutateDirectById({
        objectId: dmId,
        typing: isTyping
          ? [...new Set([...direct.typing, uid])]
          : direct.typing.filter((id) => id !== uid),
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
    const { id: dmId } = req.params;
    const { uid } = res.locals;

    const direct = await getDirectById(dmId);

    if (!direct.members.includes(uid))
      throw new Error("The user is not in the Direct.");

    if (
      timeDiff(new Date(direct.lastTypingReset), Date.now()) >= 30 &&
      direct.typing.length > 0
    ) {
      await mutateDirectById({
        objectId: dmId,
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
  closeDirect,
  createDirect,
  typingIndicator,
  resetTyping,
};
