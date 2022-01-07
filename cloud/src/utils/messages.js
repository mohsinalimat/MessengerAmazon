const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const createMessageDB = async (data) => {
  const gqlQuery = `
  mutation CreateMessageMutation($input: CreateMessageInput!) {
    createMessage(input: $input) {
      chatId
      chatType
      counter
      createdAt
      fileName
      fileSize
      fileType
      fileURL
      isDeleted
      isEdited
      mediaDuration
      mediaHeight
      mediaWidth
      objectId
      senderId
      sticker
      text
      thumbnailURL
      workspaceId
      updatedAt
    }
  }
  `;

  const { createMessage: res } = await query(
    gqlQuery,
    "CreateMessageMutation",
    {
      input: data,
    }
  );

  return res;
};

const mutateMessageById = async (data) => {
  const gqlQuery = `
  mutation UpdateMessageMutation($input: UpdateMessageInput!) {
    updateMessage(input: $input) {
      chatId
      chatType
      counter
      createdAt
      fileName
      fileSize
      fileType
      fileURL
      isDeleted
      isEdited
      mediaDuration
      mediaHeight
      mediaWidth
      objectId
      senderId
      sticker
      text
      thumbnailURL
      workspaceId
      updatedAt
    }
  }
  `;

  const { updateMessage: res } = await query(
    gqlQuery,
    "UpdateMessageMutation",
    {
      input: data,
    }
  );

  return res;
};

const getMessageById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Message",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const getLastVisibleMessageByChat = async (chatId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Message",
      IndexName: "chatId-createdAt-index",
      KeyConditionExpression: "chatId = :chatId",
      FilterExpression: "isDeleted = :isDeleted",
      ExpressionAttributeValues: {
        ":chatId": chatId,
        ":isDeleted": false,
      },
      ScanIndexForward: false,
      Limit: 10,
    })
  );
  return data.Items[0];
};

module.exports = {
  createMessageDB,
  mutateMessageById,
  getMessageById,
  getLastVisibleMessageByChat,
};
