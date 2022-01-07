import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as cognito from "@aws-cdk/aws-cognito";
import * as s3 from "@aws-cdk/aws-s3";
import * as amplify from "@aws-cdk/aws-amplify";
import * as ecr from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";

interface Table {
  name: string;
  indexes?: ddb.GlobalSecondaryIndexProps[];
  customListRequestTemplate?: string;
}

export class RelatedChatAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create main S3 bucket for files
    const bucket = new s3.Bucket(this, "RelatedChatBucket", {
      accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag",
          ],
          maxAge: 3000,
        },
      ],
    });
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.StarPrincipal()],
        actions: ["s3:GetObject"],
        resources: [`${bucket.bucketArn}/*`],
      })
    );

    new cdk.CfnOutput(this, "s3Bucket", {
      value: bucket.bucketName,
    });

    // Create Amplify App
    const amplifyApp = new amplify.App(this, "RelatedChatAmplifyApp", {
      appName: "RelatedChat",
      customRules: [amplify.CustomRule.SINGLE_PAGE_APPLICATION_REDIRECT],
    });
    amplifyApp.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    const branch = new amplify.Branch(this, "RelatedChatAmplifyBranch", {
      app: amplifyApp,
      branchName: "prod",
    });
    branch.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    new cdk.CfnOutput(this, "AmplifyAppId", {
      value: amplifyApp.appId,
    });

    new cdk.CfnOutput(this, "AmplifyBranchName", {
      value: branch.branchName,
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, "RelatedChatUserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 6,
        requireDigits: true,
        requireLowercase: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      signInAliases: {
        email: true,
        username: false,
      },
      signInCaseSensitive: false,
    });
    const webApp = userPool.addClient("RelatedChatWebAppClient", {
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
      },
    });

    const identityPool = new cognito.CfnIdentityPool(
      // @ts-ignore
      this,
      "RelatedChatIdentityPool",
      {
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders: [
          {
            clientId: webApp.userPoolClientId,
            providerName: userPool.userPoolProviderName,
          },
        ],
      }
    );
    identityPool.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const unauthRole = new iam.Role(this, "RelatedChatUnauthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: {
        PublicPolicy: iam.PolicyDocument.fromJson({
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["s3:GetObject"],
              Resource: ["arn:aws:s3:::s3-messengeraws80847-staging/*"],
              Effect: "Allow",
            },
          ],
        }),
      },
    });
    unauthRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const authRole = new iam.Role(this, "RelatedChatAuthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      inlinePolicies: {
        PublicPolicy: iam.PolicyDocument.fromJson({
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["s3:PutObject", "s3:GetObject"],
              Resource: ["arn:aws:s3:::s3-messengeraws80847-staging/*"],
              Effect: "Allow",
            },
          ],
        }),
      },
    });
    authRole.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const roleAttachment = new cognito.CfnIdentityPoolRoleAttachment(
      // @ts-ignore
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: identityPool.ref,
        roles: {
          authenticated: authRole.roleArn,
          unauthenticated: unauthRole.roleArn,
        },
      }
    );
    roleAttachment.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolWebClientId", {
      value: webApp.userPoolClientId,
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });

    // Creates the AppSync API
    const api = new appsync.GraphqlApi(this, "Api", {
      name: "RelatedChat",
      schema: appsync.Schema.fromAsset("graphql/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            // @ts-ignore
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
    });

    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl,
    });

    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || "",
    });

    const tables: Table[] = [
      {
        name: "User",
        indexes: [
          {
            indexName: "email-index",
            partitionKey: {
              name: "email",
              type: ddb.AttributeType.STRING,
            },
            projectionType: ddb.ProjectionType.KEYS_ONLY,
          },
        ],
      },
      {
        name: "Channel",
        indexes: [
          {
            indexName: "workspaceId-index",
            partitionKey: {
              name: "workspaceId",
              type: ddb.AttributeType.STRING,
            },
            projectionType: ddb.ProjectionType.ALL,
          },
        ],
      },
      {
        name: "Detail",
        indexes: [
          {
            indexName: "workspaceId-index",
            partitionKey: {
              name: "workspaceId",
              type: ddb.AttributeType.STRING,
            },
            projectionType: ddb.ProjectionType.KEYS_ONLY,
          },
        ],
      },
      {
        name: "Direct",
        indexes: [
          {
            indexName: "workspaceId-index",
            partitionKey: {
              name: "workspaceId",
              type: ddb.AttributeType.STRING,
            },
            projectionType: ddb.ProjectionType.INCLUDE,
            nonKeyAttributes: ["members"],
          },
        ],
      },
      {
        name: "Message",
        indexes: [
          {
            indexName: "chatId-createdAt-index",
            partitionKey: {
              name: "chatId",
              type: ddb.AttributeType.STRING,
            },
            sortKey: {
              name: "createdAt",
              type: ddb.AttributeType.STRING,
            },
            projectionType: ddb.ProjectionType.ALL,
          },
        ],
        customListRequestTemplate: "query-messages",
      },
      {
        name: "Presence",
      },
      {
        name: "Workspace",
      },
    ];

    const tablesWithoutSource: Table[] = [
      {
        name: "Version",
      },
    ];

    tablesWithoutSource.forEach((table) => {
      new ddb.Table(this, `${table.name}Table`, {
        tableName: table.name,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        partitionKey: {
          name: "objectId",
          type: ddb.AttributeType.STRING,
        },
      });
    });

    tables.forEach((table) => {
      const dndbTable = new ddb.Table(this, `${table.name}Table`, {
        tableName: table.name,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
        partitionKey: {
          name: "objectId",
          type: ddb.AttributeType.STRING,
        },
      });
      table.indexes?.forEach((index) => {
        dndbTable.addGlobalSecondaryIndex(index);
      });

      const dataSource = api.addDynamoDbDataSource(table.name, dndbTable);
      dataSource.createResolver({
        typeName: "Query",
        fieldName: `get${table.name}`,
        requestMappingTemplate:
          appsync.MappingTemplate.fromFile("resolvers/get.txt"),
        responseMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/response.txt"
        ),
      });
      if (table.customListRequestTemplate) {
        dataSource.createResolver({
          typeName: "Query",
          fieldName: `list${table.name}s`,
          requestMappingTemplate: appsync.MappingTemplate.fromFile(
            `resolvers/${table.customListRequestTemplate}.txt`
          ),
          responseMappingTemplate: appsync.MappingTemplate.fromFile(
            "resolvers/response.txt"
          ),
        });
      } else {
        dataSource.createResolver({
          typeName: "Query",
          fieldName: `list${table.name}s`,
          requestMappingTemplate:
            appsync.MappingTemplate.fromFile("resolvers/list.txt"),
          responseMappingTemplate: appsync.MappingTemplate.fromFile(
            "resolvers/response.txt"
          ),
        });
      }
      dataSource.createResolver({
        typeName: "Mutation",
        fieldName: `create${table.name}`,
        requestMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/create.txt"
        ),
        responseMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/response.txt"
        ),
      });
      dataSource.createResolver({
        typeName: "Mutation",
        fieldName: `update${table.name}`,
        requestMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/update.txt"
        ),
        responseMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/response.txt"
        ),
      });
      dataSource.createResolver({
        typeName: "Mutation",
        fieldName: `delete${table.name}`,
        requestMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/delete.txt"
        ),
        responseMappingTemplate: appsync.MappingTemplate.fromFile(
          "resolvers/response.txt"
        ),
      });
    });

    // Create ECR repo for the backend Docker image
    new ecr.Repository(this, "RelatedChatRepo", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: "relatedchat-api",
    });

    new cdk.CfnOutput(this, "Stack Region", {
      value: this.region,
    });
  }
}
