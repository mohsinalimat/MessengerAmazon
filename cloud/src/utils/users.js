const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const {
  GetCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const createUserDB = async (data) => {
  const CreateUser = `
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        objectId
        fullName
        displayName
        email
        phoneNumber
        title
        theme
        photoURL
        thumbnailURL
        updatedAt
        createdAt
        workspaces
      }
    }  
  `;

  const { createUser: user } = await query(CreateUser, "CreateUser", {
    input: data,
  });

  return user;
};

const mutateUserById = async (data) => {
  const MutateUserById = `
    mutation MutateUserById($input: UpdateUserInput!) {
      updateUser(input: $input) {
        objectId
        fullName
        displayName
        email
        phoneNumber
        title
        theme
        photoURL
        thumbnailURL
        updatedAt
        createdAt
        workspaces
      }
    }
  `;

  const { updateUser: user } = await query(MutateUserById, "MutateUserById", {
    input: data,
  });

  return user;
};

const getUserById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "User",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const getUserByEmail = async (email) => {
  const data = await dynamoDB.send(
    new QueryCommand({
      TableName: "User",
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    })
  );
  if (data.Count === 0) throw new Error("Not found");
  return data.Items[0];
};

const getUsersByWorkspace = async (workspaceId) => {
  const data = await dynamoDB.send(
    new ScanCommand({
      TableName: "User",
      FilterExpression: "contains (workspaces, :workspaceId)",
      ExpressionAttributeValues: {
        ":workspaceId": workspaceId,
      },
    })
  );
  return data.Items;
};

const addWorkspaceToUser = async (workspaceId, userId) => {
  const user = await getUserById(userId);
  const data = await mutateUserById({
    objectId: userId,
    workspaces: [...new Set([...user.workspaces, workspaceId])],
    updatedAt: new Date().toISOString(),
  });
  return data;
};

const removeWorkspaceFromUser = async (workspaceId, userId) => {
  const user = await getUserById(userId);
  const data = await mutateUserById({
    objectId: userId,
    workspaces: user.workspaces.filter((id) => id !== workspaceId),
    updatedAt: new Date().toISOString(),
  });
  return data;
};

module.exports = {
  addWorkspaceToUser,
  removeWorkspaceFromUser,
  getUserByEmail,
  getUsersByWorkspace,
  getUserById,
  mutateUserById,
  createUserDB,
};
