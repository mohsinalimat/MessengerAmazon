const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const createDirect = async (data) => {
  const gqlQuery = `
  mutation CreateDirectMutation($input: CreateDirectInput!) {
    createDirect(input: $input) {
      active
      createdAt
      lastTypingReset
      lastMessageCounter
      lastMessageText
      members
      objectId
      typing
      updatedAt
      workspaceId
    }
  }
  `;

  const { createDirect: res } = await query(gqlQuery, "CreateDirectMutation", {
    input: data,
  });

  return res;
};

const mutateDirectById = async (data) => {
  const gqlQuery = `
  mutation UpdateDirectMutation($input: UpdateDirectInput!) {
    updateDirect(input: $input) {
      active
      createdAt
      lastTypingReset
      lastMessageCounter
      lastMessageText
      members
      objectId
      typing
      updatedAt
      workspaceId
    }
  }
  `;

  const { updateDirect: res } = await query(gqlQuery, "UpdateDirectMutation", {
    input: data,
  });

  return res;
};

const getDirectById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Direct",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const getDirectsByWorkspace = async (workspaceId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Direct",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
      },
    })
  );
  return data.Items;
};

const getDirectsByUser = async (workspaceId, userId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Direct",
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

const addUsersToDirectActive = async (
  directId,
  userIds,
  directObject,
  otherFields
) => {
  const direct = directObject || (await getDirectById(directId));
  const data = await mutateDirectById({
    objectId: directId,
    active: [...new Set([...direct.active, ...userIds])],
    updatedAt: new Date().toISOString(),
    ...otherFields,
  });
  return data;
};

const removeUserFromDirectActive = async (directId, userId, directObject) => {
  const direct = directObject || (await getDirectById(directId));
  const data = await mutateDirectById({
    objectId: directId,
    active: direct.active.filter((id) => id !== userId),
    updatedAt: new Date().toISOString(),
  });
  return data;
};

module.exports = {
  createDirect,
  mutateDirectById,
  getDirectById,
  getDirectsByWorkspace,
  getDirectsByUser,
  addUsersToDirectActive,
  removeUserFromDirectActive,
};
