export const OnUpdateUserById = `
subscription OnUpdateUserById($objectId: String) {
  onUpdateUser(objectId: $objectId) {
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

export const OnUpdateUser = `
subscription OnUpdateUser {
  onUpdateUser {
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

export const OnUpdateWorkspace = `
subscription OnUpdateWorkspace {
  onUpdateWorkspace {
    channelId
    createdAt
    details
    isDeleted
    members
    name
    objectId
    photoURL
    updatedAt
    ownerId
    thumbnailURL
  }
}
`;

export const OnUpdateChannelByWorkspace = `
subscription OnUpdateChannelByWorkspace($workspaceId: String) {
  onUpdateChannel(workspaceId: $workspaceId) {
    createdAt
    createdBy
    details
    isArchived
    isDeleted
    lastMessageCounter
    lastMessageText
    lastTypingReset
    members
    name
    objectId
    topic
    typing
    updatedAt
    workspaceId
  }
}
`;

export const OnUpdateDirectByWorkspace = `
subscription OnUpdateDirectByWorkspace($workspaceId: String) {
  onUpdateDirect(workspaceId: $workspaceId) {
    active
    createdAt
    lastMessageCounter
    lastMessageText
    lastTypingReset
    members
    objectId
    typing
    updatedAt
    workspaceId
  }
}
`;

export const onUpdateDetail = `
subscription onUpdateDetail($workspaceId: String, $userId: String) {
  onUpdateDetail(workspaceId: $workspaceId, userId: $userId) {
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

export const onUpdateMessage = `
subscription onUpdateMessage($chatId: String) {
  onUpdateMessage(chatId: $chatId) {
    chatId
    chatType
    counter
    createdAt
    fileName
    fileSize
    fileType
    fileURL
    isDeleted
    isEdited
    mediaDuration
    mediaHeight
    mediaWidth
    objectId
    senderId
    sticker
    text
    thumbnailURL
    workspaceId
    updatedAt
  }
}
`;

export const OnUpdatePresenceById = `
subscription OnUpdatePresenceById($objectId: String) {
  onUpdatePresence(objectId: $objectId) {
    createdAt
    objectId
    lastPresence
    updatedAt
  }
}
`;
