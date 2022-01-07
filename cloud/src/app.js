const express = require("express");
const cors = require("cors");
const messages = require("./controllers/messages");
const channels = require("./controllers/channels");
const workspaces = require("./controllers/workspaces");
const users = require("./controllers/users");
const directs = require("./controllers/directs");
const {
  BACKEND_DATABASE_COMPATIBILITY,
  BACKEND_CLIENT_COMPATIBILITY,
  NEWEST_DB_VERSION,
} = require("./config");
const verifyJWT = require("./utils/cognito-verify");
const { getVersion, setVersion } = require("./utils/versions");

const app = express();

app.set("json spaces", 2);
app.use(cors({ origin: "*", methods: "GET,POST,HEAD,OPTIONS,DELETE" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make a fake request to init Cloud Functions instance and to prevent cold start on real future requests.
app.get("/warm", (req, res, next) => {
  return res.status(200).json({
    success: true,
  });
});

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const authMiddleware = async (req, res, next) => {
  try {
    if (!(req.headers && req.headers.authorization))
      throw new Error("The function must be called by an authenticated user.");

    const token = req.headers.authorization.split("Bearer ")[1];
    if (!token)
      throw new Error("The function must be called by an authenticated user.");

    const decodedToken = await verifyJWT(token);
    if (!decodedToken.isValid) throw new Error("Your token is invalid.");

    res.locals.uid = decodedToken.userName;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const versionMiddleware = async (req, res, next) => {
  try {
    if (!(req.headers && req.headers["x-client-version"]))
      throw new Error("The version should be set in a request header.");

    const clientVersion = req.headers["x-client-version"];

    let databaseVersion = NEWEST_DB_VERSION;
    const versionDoc = await getVersion();
    if (!versionDoc) {
      await setVersion(databaseVersion);
    } else databaseVersion = versionDoc.databaseVersion;

    if (
      !BACKEND_DATABASE_COMPATIBILITY.includes(databaseVersion) ||
      !BACKEND_CLIENT_COMPATIBILITY.includes(clientVersion)
    )
      throw new Error("Version error. Please contact your administrator.");

    return next();
  } catch (err) {
    return next(err);
  }
};

const channelsRouter = express.Router();
channelsRouter.use(authMiddleware);
channelsRouter.post("/", channels.createChannel);
channelsRouter.post("/:id", channels.updateChannel);
channelsRouter.post("/:id/members", channels.addMember);
channelsRouter.delete("/:id/members/:userId", channels.deleteMember);
channelsRouter.delete("/:id", channels.deleteChannel);
channelsRouter.post("/:id/archive", channels.archiveChannel);
channelsRouter.post("/:id/unarchive", channels.unarchiveChannel);
channelsRouter.post("/:id/typing_indicator", channels.typingIndicator);
channelsRouter.post("/:id/reset_typing", channels.resetTyping);

const directsRouter = express.Router();
directsRouter.use(authMiddleware);
directsRouter.post("/", directs.createDirect);
directsRouter.post("/:id/close", directs.closeDirect);
directsRouter.post("/:id/typing_indicator", directs.typingIndicator);
directsRouter.post("/:id/reset_typing", directs.resetTyping);

const workspacesRouter = express.Router();
workspacesRouter.use(authMiddleware);
workspacesRouter.post("/", workspaces.createWorkspace);
workspacesRouter.post("/:id", workspaces.updateWorkspace);
workspacesRouter.delete("/:id", workspaces.deleteWorkspace);
workspacesRouter.post("/:id/members", workspaces.addTeammate);
workspacesRouter.delete("/:id/members/:userId", workspaces.deleteTeammate);

const messagesRouter = express.Router();
messagesRouter.use(authMiddleware);
messagesRouter.post("/", messages.createMessage);
messagesRouter.post("/:id", messages.editMessage);
messagesRouter.delete("/:id", messages.deleteMessage);

const usersRouter = express.Router();
usersRouter.post("/", users.createUser);
usersRouter.post("/:id", authMiddleware, users.updateUser);
usersRouter.post("/:id/presence", authMiddleware, users.updatePresence);
usersRouter.post("/:id/read", authMiddleware, users.read);

app.use(versionMiddleware);
app.post("/auth/login", users.loginUser);
app.use("/users", usersRouter);
app.use("/messages", messagesRouter);
app.use("/channels", channelsRouter);
app.use("/workspaces", workspacesRouter);
app.use("/directs", directsRouter);

app.use((req, res, next) => {
  if (!res.locals.data) throw new Error("The requested URL was not found.");
  res.statusCode = 200;
  if (res.locals.data === true) return res.end();
  res.set("Content-Type", "application/json");
  return res.json(res.locals.data);
});

app.use((err, req, res, next) => {
  res.set("Content-Type", "application/json");
  res.statusCode = 400;
  console.error(err.message);
  return res.json({
    error: {
      message: err.message,
    },
  });
});

// app.listen(5001, () =>
//   console.log("Related:Chat API is listening on port 5001...")
// );

module.exports = app;
