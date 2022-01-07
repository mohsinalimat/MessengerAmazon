const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const createDetail = async (data) => {
  const gqlQuery = `
  mutation CreateDetailMutation($input: CreateDetailInput!) {
    createDetail(input: $input) {
      chatId
      createdAt
      lastRead
      objectId
      updatedAt
      userId
      workspaceId
    }
  }
  `;

  const { createDetail: res } = await query(gqlQuery, "CreateDetailMutation", {
    input: data,
  });

  return res;
};

const mutateDetailById = async (data) => {
  const gqlQuery = `
  mutation CreateDetailMutation($input: UpdateDetailInput!) {
    updateDetail(input: $input) {
      chatId
      createdAt
      lastRead
      objectId
      updatedAt
      userId
      workspaceId
    }
  }
  `;

  const { updateDetail: res } = await query(gqlQuery, "CreateDetailMutation", {
    input: data,
  });

  return res;
};

const getDetailById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Detail",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const getDetailsByWorkspace = async (workspaceId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Detail",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
      },
    })
  );
  return data.Items;
};

const getDetailsByWorkspaceAndUser = async (workspaceId, userId) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "Detail",
      IndexName: "workspaceId-index",
      KeyConditionExpression: "workspaceId = :workspaceId",
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
        ":userId": userId,
      },
    })
  );
  return data.Items;
};

module.exports = {
  createDetail,
  mutateDetailById,
  getDetailById,
  getDetailsByWorkspace,
  getDetailsByWorkspaceAndUser,
};
