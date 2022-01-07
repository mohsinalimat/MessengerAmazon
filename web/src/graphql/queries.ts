export const GetAllUsers = `
query GetAllUsers {
  listUsers {
    items {
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
}
`;

export const GetUserById = `
query GetUserById($objectId: String!) {
  getUser(objectId: $objectId) {
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

export const GetAllWorkspaces = `
query GetAllWorkspaces {
  listWorkspaces {
    items {
      objectId
      channelId
      name
      members
      ownerId
      details
      photoURL
      thumbnailURL
      isDeleted
      updatedAt
      createdAt
    }
  }
}
`;

export const GetChannelsByWorkspace = `
query GetChannelsByWorkspace($filter: TableChannelFilterInput) {
  listChannels(filter: $filter) {
    items {
      objectId
      workspaceId
      name
      lastTypingReset
      updatedAt
      createdAt
      createdBy
      isDeleted
      isArchived
      topic
      details
      lastMessageCounter
      lastMessageText
      members
      typing
    }
  }
}
`;

export const GetDirectsByWorkspace = `
query GetDirectsByWorkspace($filter: TableDirectFilterInput) {
  listDirects(filter: $filter) {
    items {
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
}
`;

export const GetDetailsByWorkspace = `
query GetDetailsByWorkspace($filter: TableDetailFilterInput) {
  listDetails(filter: $filter) {
    items {
      chatId
      createdAt
      lastRead
      objectId
      updatedAt
      userId
      workspaceId
    }
  }
}
`;

export const GetMessages = `
query GetMessages($chatId: String!, $limit: Int, $nextToken: String) {
  listMessages(chatId: $chatId, limit: $limit, nextToken: $nextToken) {
    items {
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
    nextToken
  }
}
`;

export const GetPresenceById = `
query GetPresenceById($objectId: String!) {
  getPresence(objectId: $objectId) {
    createdAt
    lastPresence
    objectId
    updatedAt
  }
}
`;
