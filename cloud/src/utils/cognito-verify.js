const jwkToPem = require("jwk-to-pem");
const axios = require("axios");
const util = require("util");
const promisify = util.promisify;
const jsonwebtoken = require("jsonwebtoken");
const { AWS_USER_POOL_ID } = require("../config");

const cognitoIssuer = `https://cognito-idp.us-east-1.amazonaws.com/${AWS_USER_POOL_ID}`;

let cacheKeys;
const getPublicKeys = async () => {
  if (!cacheKeys) {
    const url = `${cognitoIssuer}/.well-known/jwks.json`;
    const publicKeys = await axios.default.get(url);
    cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
      const pem = jwkToPem(current);
      agg[current.kid] = { instance: current, pem };
      return agg;
    }, {});
    return cacheKeys;
  } else {
    return cacheKeys;
  }
};

const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

const handler = async (token) => {
  let result;
  try {
    const tokenSections = (token || "").split(".");
    if (tokenSections.length < 2) {
      throw new Error("requested token is invalid");
    }
    const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
    const header = JSON.parse(headerJSON);
    const keys = await getPublicKeys();
    const key = keys[header.kid];
    if (key === undefined) {
      throw new Error("claim made for unknown kid");
    }
    const claim = await verifyPromised(token, key.pem);
    const currentSeconds = Math.floor(new Date().valueOf() / 1000);
    if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
      throw new Error("claim is expired or invalid");
    }
    if (claim.iss !== cognitoIssuer) {
      throw new Error("claim issuer is invalid");
    }
    if (claim.token_use !== "access") {
      throw new Error("claim use is not access");
    }
    result = {
      userName: claim.username,
      clientId: claim.client_id,
      isValid: true,
    };
  } catch (error) {
    result = { userName: "", clientId: "", error, isValid: false };
  }
  return result;
};

module.exports = handler;
