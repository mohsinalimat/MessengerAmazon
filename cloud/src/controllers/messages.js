// eslint-disable-next-line no-unused-vars
const express = require("express");
const { sha256 } = require("../utils");
const { v4: uuidv4 } = require("uuid");
const {
  createPersistentDownloadUrlWithMetadata,
  saveImageThumbnail,
} = require("../utils/storage");
const { MESSAGE_THUMBNAIL_WIDTH } = require("../config");
const { getChannelById, mutateChannelById } = require("../utils/channels");
const {
  getDetailById,
  mutateDetailById,
  createDetail: createDetailDB,
} = require("../utils/details");
const { getDirectById, mutateDirectById } = require("../utils/directs");
const {
  createMessageDB,
  getMessageById,
  mutateMessageById,
  getLastVisibleMessageByChat,
} = require("../utils/messages");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createMessage = async (req, res, next) => {
  try {
    const {
      text,
      chatId,
      workspaceId,
      chatType,
      filePath,
      sticker,
      fileName,
      objectId: customObjectId,
    } = req.body;
    const { uid } = res.locals;

    if (!chatId || !workspaceId || !chatType) {
      throw new Error("Arguments are missing.");
    }

    const chat =
      chatType === "Channel"
        ? await getChannelById(chatId)
        : await getDirectById(chatId);

    if (!chat.members.includes(uid))
      throw new Error("The user is not authorized to create a message.");

    const lastMessageCounter = chat.lastMessageCounter || 0;

    const detailId = sha256(`${uid}#${chatId}`);
    const chatDetails = await getDetailById(detailId);

    const [fileURL, fileDetails] =
      await createPersistentDownloadUrlWithMetadata(filePath);
    const [thumbnailURL, fileMetadata] = await saveImageThumbnail(
      filePath,
      MESSAGE_THUMBNAIL_WIDTH,
      null,
      fileDetails,
      true,
      true
    );

    const promises = [];

    const messageId = customObjectId || uuidv4();
    promises.push(
      createMessageDB({
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        text: text || "",
        mediaWidth: (fileMetadata && fileMetadata.width) || null,
        mediaHeight: (fileMetadata && fileMetadata.height) || null,
        mediaDuration: (fileMetadata && fileMetadata.duration) || null,
        fileURL,
        thumbnailURL,
        fileSize: fileDetails ? fileDetails.ContentLength : null,
        fileType: fileDetails ? fileDetails.ContentType : null,
        fileName: fileName || null,
        sticker: sticker || null,
        objectId: messageId,
        senderId: uid,
        workspaceId,
        chatId,
        chatType,
        counter: lastMessageCounter + 1,
        isDeleted: false,
        isEdited: false,
      })
    );

    if (chatType === "Channel") {
      promises.push(
        mutateChannelById({
          objectId: chatId,
          lastMessageText: text || "",
          lastMessageCounter: chat.lastMessageCounter + 1,
          typing: chat.typing.filter((u) => u !== uid),
          updatedAt: new Date().toISOString(),
        })
      );
    } else {
      promises.push(
        mutateDirectById({
          objectId: chatId,
          lastMessageText: text || "",
          lastMessageCounter: chat.lastMessageCounter + 1,
          typing: chat.typing.filter((u) => u !== uid),
          updatedAt: new Date().toISOString(),
          active: chat.members,
        })
      );
    }

    if (chatDetails) {
      promises.push(
        mutateDetailById({
          objectId: detailId,
          lastRead: lastMessageCounter + 1,
          updatedAt: new Date().toISOString(),
        })
      );
    } else {
      promises.push(
        createDetailDB({
          objectId: detailId,
          chatId,
          userId: uid,
          workspaceId,
          lastRead: lastMessageCounter + 1,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        })
      );
    }

    await Promise.all(promises);

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
const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    const message = await getMessageById(id);
    const chat =
      message.chatType === "Channel"
        ? await getChannelById(message.chatId)
        : await getDirectById(message.chatId);

    if (!chat.members.includes(uid)) {
      throw new Error("The user is not authorized to edit this message.");
    }
    if (message.senderId !== uid) {
      throw new Error("The user is not authorized to edit this message.");
    }

    const promises = [];

    promises.push(
      mutateMessageById({
        objectId: id,
        text,
        updatedAt: new Date().toISOString(),
        isEdited: true,
      })
    );

    const lastMessage = await getLastVisibleMessageByChat(message.chatId);
    if (lastMessage.counter === message.counter) {
      if (message.chatType === "Channel") {
        promises.push(
          mutateChannelById({
            objectId: message.chatId,
            lastMessageText: text,
            updatedAt: new Date().toISOString(),
          })
        );
      } else {
        promises.push(
          mutateDirectById({
            objectId: message.chatId,
            lastMessageText: text,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    }

    await Promise.all(promises);

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
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    const message = await getMessageById(id);
    const chat =
      message.chatType === "Channel"
        ? await getChannelById(message.chatId)
        : await getDirectById(message.chatId);

    if (!chat.members.includes(uid)) {
      throw new Error("The user is not authorized to delete this message.");
    }
    if (message.senderId !== uid) {
      throw new Error("The user is not authorized to delete this message.");
    }

    await mutateMessageById({
      objectId: id,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });

    const lastMessage = await getLastVisibleMessageByChat(message.chatId);

    if (!lastMessage || lastMessage.text !== chat.lastMessageText) {
      if (message.chatType === "Channel") {
        await mutateChannelById({
          objectId: message.chatId,
          lastMessageText: !lastMessage ? "" : lastMessage.text,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await mutateDirectById({
          objectId: message.chatId,
          lastMessageText: !lastMessage ? "" : lastMessage.text,
          updatedAt: new Date().toISOString(),
        });
      }
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
  createMessage,
  editMessage,
  deleteMessage,
};
