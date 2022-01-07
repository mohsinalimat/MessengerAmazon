const fs = require('fs');

(() => {
  const StackApp = JSON.parse(fs.readFileSync('./mainStack.json'));
  const StackSecrets = {};
  StackApp.Stacks[0].Outputs.forEach((output) => {
    StackSecrets[output.OutputKey] = output.OutputValue;
  });

  fs.writeFileSync('./cfsecrets.json', JSON.stringify(StackSecrets, null, 2));

  const StackApp2 = JSON.parse(fs.readFileSync('./lambdaStack.json'));
  const StackSecrets2 = {};
  StackApp2.Stacks[0].Outputs.forEach((output) => {
    StackSecrets2[output.OutputKey] = output.OutputValue;
  });

  const env = `
REACT_APP_API_URL=${StackSecrets2.ServiceEndpoint}
REACT_APP_AWS_PROJECT_REGION=${StackSecrets.StackRegion}
REACT_APP_AWS_COGNITO_IDENTITY_POOL_ID=${StackSecrets.IdentityPoolId}
REACT_APP_AWS_USER_POOL_ID=${StackSecrets.UserPoolId}
REACT_APP_AWS_USER_POOL_WEB_CLIENT_ID=${StackSecrets.UserPoolWebClientId}
REACT_APP_AWS_S3_BUCKET=${StackSecrets.s3Bucket}
REACT_APP_AWS_APPSYNC_GRAPHQL_ENDPOINT=${StackSecrets.GraphQLAPIURL}
REACT_APP_AWS_APPSYNC_APIKEY=${StackSecrets.GraphQLAPIKey}
  `;

  fs.writeFileSync('.env', env);
})();
