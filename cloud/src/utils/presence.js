const { dynamoDB } = require("../utils");
const { query } = require("./graphql");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");

const createPresenceDB = async (data) => {
  const CreateChannel = `
  mutation CreatePresenceMutation($input: CreatePresenceInput!) {
    createPresence(input: $input) {
      objectId
      lastPresence
      updatedAt
      createdAt
    }
  }
  `;

  const { createPresence: presence } = await query(
    CreateChannel,
    "CreatePresenceMutation",
    {
      input: data,
    }
  );

  return presence;
};

const mutatePresenceById = async (data) => {
  const MutateChannelById = `
  mutation CreatePresenceMutation($input: UpdatePresenceInput!) {
    updatePresence(input: $input) {
      objectId
      lastPresence
      updatedAt
      createdAt
    }
  }
  `;

  const { updatePresence: presence } = await query(
    MutateChannelById,
    "CreatePresenceMutation",
    {
      input: data,
    }
  );

  return presence;
};

const getPresenceById = async (id) => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Presence",
      Key: {
        objectId: id,
      },
    })
  );
  return data.Item;
};

module.exports = {
  createPresenceDB,
  mutatePresenceById,
  getPresenceById,
};
