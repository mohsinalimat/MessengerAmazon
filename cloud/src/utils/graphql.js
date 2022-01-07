const fetch = require("node-fetch");
const { AWS_APPSYNC_ENDPOINT, AWS_APPSYNC_API_KEY } = require("../config");

const query = async (query, operationName, variables) => {
  const data = await fetch(AWS_APPSYNC_ENDPOINT, {
    method: "post",
    headers: {
      "Content-Type": "application/graphql",
      "x-api-key": AWS_APPSYNC_API_KEY,
    },
    body: JSON.stringify({
      query,
      operationName,
      variables,
    }),
  });
  const res = await data.json();
  // console.log(JSON.stringify(res, null, 2));
  return res.data;
};

module.exports = {
  query,
};
