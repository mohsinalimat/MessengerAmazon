const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const createChannel = async (data) => {
  const CreateChannel = `
  mutation CreateChannelMutation($input: CreateChannelInput!) {
    createChannel(input: $input) {
      objectId
      workspaceId
      name
      lastTypingReset
      updatedAt
      createdAt
      createdBy
      isDeleted
      isArchived
      topic
      details
      lastMessageCounter
      lastMessageText
      members
      typing
    }
  }
  `;

  const { createChannel: channel } = await query(
    CreateChannel,
    "CreateChannelMutation",
    {
      input: data,
    }
  );

  return channel;
};

const mutateChannelById = async (data) => {
  const MutateChannelById = `
  mutation UpdateChannelMutation($input: UpdateChannelInput!) {
    updateChannel(input: $input) {
        objectId
        workspaceId
        name
        lastTypingReset
        updatedAt
        createdAt
        createdBy
        isDeleted
        isArchived
        topic
        details
        lastMessageCounter
        lastMessageText
        members
        typing
    }
  }
  `;

  const { updateChannel: channel } = await query(
    MutateChannelById,
    "UpdateChannelMutation",
    {
      input: data,
    }
  );

  return channel;
};

const getChannelById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Channel",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const getChannelsByWorkspace = async (workspaceId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Channel",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      FilterExpression: "isDeleted = :isDeleted",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
        ":isDeleted": false,
      },
    })
  );
  return data.Items;
};

const getChannelsByUser = async (workspaceId, userId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Channel",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      FilterExpression: "contains (members, :userId)",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
        ":userId": userId,
      },
    })
  );
  return data.Items;
};

const getChannelsByName = async (workspaceId, name) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Channel",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      FilterExpression: "#channel_name = :name",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
        ":name": name.replace("#", ""),
      },
      ExpressionAttributeNames: {
        "#channel_name": "name",
      },
    })
  );
  return data.Items;
};

const addUserToChannel = async (
  channelId,
  userId,
  channelObject,
  otherFields
) => {
  const channel = channelObject || (await getChannelById(channelId));
  const data = await mutateChannelById({
    objectId: channelId,
    members: [...new Set([...channel.members, userId])],
    updatedAt: new Date().toISOString(),
    ...otherFields,
  });
  return data;
};

const removeUserFromChannel = async (channelId, userId, channelObject) => {
  const channel = channelObject || (await getChannelById(channelId));
  const data = await mutateChannelById({
    objectId: channelId,
    members: channel.members.filter((id) => id !== userId),
    updatedAt: new Date().toISOString(),
  });
  return data;
};

module.exports = {
  createChannel,
  mutateChannelById,
  getChannelById,
  addUserToChannel,
  removeUserFromChannel,
  getChannelsByWorkspace,
  getChannelsByUser,
  getChannelsByName,
};
