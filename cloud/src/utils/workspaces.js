const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");

const createWorkspace = async (data) => {
  const CreateWorkspace = `
  mutation CreateWorkspaceMutation($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      objectId
      channelId
      members
      name
      ownerId
      details
      photoURL
      thumbnailURL
      isDeleted
      updatedAt
      createdAt
    }
  }
  `;

  const { createWorkspace: workspace } = await query(
    CreateWorkspace,
    "CreateWorkspaceMutation",
    {
      input: data,
    }
  );

  return workspace;
};

const mutateWorkspaceById = async (data) => {
  const MutateWorkspaceById = `
  mutation CreateWorkspaceMutation($input: UpdateWorkspaceInput!) {
    updateWorkspace(input: $input) {
      objectId
      name
      channelId
      members
      ownerId
      details
      thumbnailURL
      photoURL
      isDeleted
      updatedAt
      createdAt
    }
  }
  `;

  const { updateWorkspace: workspace } = await query(
    MutateWorkspaceById,
    "CreateWorkspaceMutation",
    {
      input: data,
    }
  );

  return workspace;
};

const getWorkspaceById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Workspace",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

const addUserToWorkspace = async (workspaceId, userId, workspaceObject) => {
  const workspace = workspaceObject || (await getWorkspaceById(workspaceId));
  const data = await mutateWorkspaceById({
    objectId: workspaceId,
    members: [...new Set([...workspace.members, userId])],
    updatedAt: new Date().toISOString(),
  });
  return data;
};

const removeUserFromWorkspace = async (
  workspaceId,
  userId,
  workspaceObject
) => {
  const workspace = workspaceObject || (await getWorkspaceById(workspaceId));
  const data = await mutateWorkspaceById({
    objectId: workspaceId,
    members: workspace.members.filter((id) => id !== userId),
    updatedAt: new Date().toISOString(),
  });
  return data;
};

module.exports = {
  getWorkspaceById,
  createWorkspace,
  mutateWorkspaceById,
  addUserToWorkspace,
  removeUserFromWorkspace,
};
