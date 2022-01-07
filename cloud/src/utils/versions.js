const { dynamoDB } = require("../utils");
const { GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const getVersion = async () => {
  const data = await dynamoDB.send(
    new GetCommand({
      TableName: "Version",
      Key: {
        objectId: "version",
      },
    })
  );
  return data.Item;
};

const setVersion = async (databaseVersion) => {
  const data = await dynamoDB.send(
    new PutCommand({
      TableName: "Version",
      Item: {
        objectId: "version",
        databaseVersion,
      },
    })
  );
  return data;
};

module.exports = {
  getVersion,
  setVersion,
};
