import Style from 'components/Style';
import WideScreen from 'components/WideScreen';
import { DEFAULT_THEME, THEMES_COUNT } from 'config';
import { AuthProvider } from 'contexts/AmplifyContext';
import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useChannelsByWorkspace } from 'hooks/useChannels';
import { useDetailsByWorkspace } from 'hooks/useDetails';
import { useDirectMessagesByWorkspace } from 'hooks/useDirects';
import { useGraphQLDocument } from 'hooks/useGraphQL';
import { useUsersByWorkspace } from 'hooks/useUsers';
import { useAllWorkspaces } from 'hooks/useWorkspaces';
import {
  AllChannelsContext,
  ChannelsContext,
  CreateChannelContext,
  CreateMessageContext,
  CreateWorkspaceContext,
  DetailsContext,
  DirectMessagesContext,
  EditPasswordContext,
  InviteTeammatesContext,
  MessagesContext,
  PreferencesContext,
  PresencesContext,
  ThemeContext,
  UserContext,
  UsersContext,
  WorkspacesContext,
  WorkspaceSettingsContext,
} from 'lib/context';
import {
  useCreateChannelModal,
  useCreateMessageModal,
  useCreateWorkspaceModal,
  useInviteTeammatesModal,
  usePreferencesModal,
  useWorkspaceSettingsModal,
} from 'lib/hooks';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Toaster } from 'react-hot-toast';
import { useRoutes } from 'react-router-dom';
import routes from 'routes';
import { postData } from 'utils/api-helpers';

export interface IColor {
  name: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightPurple: string;
  brightCyan: string;
  brightWhite: string;
  background: string;
  foreground: string;
  cursorColor: string;
  selectionBackground: string;
  messageFontWeight: 'regular' | 'light';
}

function EditPasswordModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <EditPasswordContext.Provider value={{ open, setOpen }}>
      {children}
    </EditPasswordContext.Provider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { userdata, user } = useContext(UserContext);
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || DEFAULT_THEME
  );
  const [themeColors, setThemeColors] = useState<IColor | null>(null);
  const themesList = useMemo(
    () =>
      Array.from(
        Array(THEMES_COUNT),
        (_, index) => `theme${index + 1 < 10 ? `0${index + 1}` : index + 1}`
      ),
    []
  );

  useEffect(() => {
    if (
      userdata?.objectId &&
      (!userdata?.theme || !themesList.includes(userdata?.theme))
    ) {
      postData(`/users/${userdata?.objectId}`, {
        theme: 'theme01',
      });
    }
  }, [userdata?.objectId]);

  useEffect(() => {
    if (userdata?.theme && themesList.includes(userdata?.theme)) {
      setTheme(userdata.theme);
    }
  }, [userdata?.theme]);

  useEffect(() => {
    if (
      userdata?.objectId &&
      !themesList.includes(userdata?.theme) &&
      !themesList.includes(DEFAULT_THEME)
    ) {
      setTheme('theme01');
    } else if (
      user !== undefined &&
      user === null &&
      !themesList.includes(DEFAULT_THEME)
    ) {
      setTheme('theme01');
    }
  }, [userdata, user]);

  useEffect(() => {
    // @ts-ignore
    document.querySelector('body').style.backgroundColor =
      themeColors?.background;
    if (themeColors)
      localStorage.setItem('backgroundColor', themeColors.background);
  }, [themeColors]);

  const getThemeColors = useCallback(() => {
    fetch(`${process.env.PUBLIC_URL}/themes/${theme}.json`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then((response) => response.json())
      .then((json) => {
        setThemeColors(json);
      });
  }, [theme]);

  useEffect(() => {
    getThemeColors();
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeColors }}>
      <Style
        css={`
          .th-bg-bg {
            background-color: ${themeColors?.background};
          }
          .th-bg-for {
            background-color: ${themeColors?.foreground};
          }
          .th-bg-selbg {
            background-color: ${themeColors?.selectionBackground};
          }
          .th-bg-red {
            background-color: ${themeColors?.red};
          }
          .th-bg-brred {
            background-color: ${themeColors?.brightRed};
          }
          .th-bg-blue {
            background-color: ${themeColors?.blue};
          }
          .th-bg-brblue {
            background-color: ${themeColors?.brightBlue};
          }
          .th-bg-brwhite {
            background-color: ${themeColors?.brightWhite};
          }
          .th-bg-yellow {
            background-color: ${themeColors?.yellow};
          }
          .th-bg-cyan {
            background-color: ${themeColors?.cyan};
          }
          .th-bg-brpurple {
            background-color: ${themeColors?.brightPurple};
          }
          .th-bg-purple {
            background-color: ${themeColors?.purple};
          }
          .th-bg-green {
            background-color: ${themeColors?.green};
          }

          .th-border-bg {
            border-color: ${themeColors?.background};
          }
          .th-border-blue {
            border-color: ${themeColors?.blue};
          }
          .th-border-selbg {
            border-color: ${themeColors?.selectionBackground};
          }
          .th-border-for {
            border-color: ${themeColors?.foreground};
          }
          .th-border-brblack {
            border-color: ${themeColors?.brightBlack};
          }

          .th-color-bg {
            color: ${themeColors?.background};
          }
          .th-color-for {
            color: ${themeColors?.foreground};
          }
          .th-color-selbg {
            color: ${themeColors?.selectionBackground};
          }
          .th-color-blue {
            color: ${themeColors?.blue};
          }
          .th-color-red {
            color: ${themeColors?.red};
          }
          .th-color-brred {
            color: ${themeColors?.brightRed};
          }
          .th-color-brwhite {
            color: ${themeColors?.brightWhite};
          }
          .th-color-black {
            color: ${themeColors?.black};
          }
          .th-color-brblack {
            color: ${themeColors?.brightBlack};
          }
        `}
      />
      {children}
    </ThemeContext.Provider>
  );
}

function WorkspacesProvider({ children }: { children: React.ReactNode }) {
  const workspacesData = useAllWorkspaces();
  return (
    <WorkspacesContext.Provider value={workspacesData}>
      {children}
    </WorkspacesContext.Provider>
  );
}

function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const channelsData = useChannelsByWorkspace();
  return (
    <ChannelsContext.Provider value={channelsData}>
      {children}
    </ChannelsContext.Provider>
  );
}

function DirectMessagesProvider({ children }: { children: React.ReactNode }) {
  const dmData = useDirectMessagesByWorkspace();
  return (
    <DirectMessagesContext.Provider value={dmData}>
      {children}
    </DirectMessagesContext.Provider>
  );
}

function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<any[]>([]);

  return (
    <MessagesContext.Provider
      value={{
        messages,
        setMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

function AllChannelsProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<any[]>([]);

  return (
    <AllChannelsContext.Provider
      value={{
        channels,
        setChannels,
      }}
    >
      {children}
    </AllChannelsContext.Provider>
  );
}

function DetailsProvider({ children }: { children: React.ReactNode }) {
  const details = useDetailsByWorkspace();
  return (
    <DetailsContext.Provider value={details}>
      {children}
    </DetailsContext.Provider>
  );
}

function UsersProvider({ children }: { children: React.ReactNode }) {
  const users = useUsersByWorkspace();
  return (
    <UsersContext.Provider value={users}>{children}</UsersContext.Provider>
  );
}

function PresencesProvider({ children }: { children: React.ReactNode }) {
  const [presences, setPresences] = useState<any[]>([]);
  return (
    <PresencesContext.Provider value={{ presences, setPresences }}>
      {children}
    </PresencesContext.Provider>
  );
}

function UserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const { value } = useGraphQLDocument(
    user?.uid,
    queries.GetUserById,
    'getUser',
    subscriptions.OnUpdateUserById,
    'onUpdateUser',
    { objectId: user?.uid },
    { objectId: user?.uid }
  );

  return (
    <UserContext.Provider value={{ user, userdata: value }}>
      {children}
    </UserContext.Provider>
  );
}

function App() {
  const content = useRoutes(routes);
  const createMessage = useCreateMessageModal();
  const createChannel = useCreateChannelModal();
  const inviteTeammate = useInviteTeammatesModal();
  const preferences = usePreferencesModal();
  const workspaceSettings = useWorkspaceSettingsModal();
  const createWorkspace = useCreateWorkspaceModal();

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/warm`);
  }, []);

  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <CreateMessageContext.Provider value={createMessage}>
            <CreateChannelContext.Provider value={createChannel}>
              <InviteTeammatesContext.Provider value={inviteTeammate}>
                <PreferencesContext.Provider value={preferences}>
                  <EditPasswordModalProvider>
                    <WorkspaceSettingsContext.Provider
                      value={workspaceSettings}
                    >
                      <CreateWorkspaceContext.Provider value={createWorkspace}>
                        <WorkspacesProvider>
                          <UsersProvider>
                            <PresencesProvider>
                              <AllChannelsProvider>
                                <ChannelsProvider>
                                  <DirectMessagesProvider>
                                    <MessagesProvider>
                                      <DetailsProvider>
                                        <Toaster position="top-center" />
                                        <WideScreen>{content}</WideScreen>
                                      </DetailsProvider>
                                    </MessagesProvider>
                                  </DirectMessagesProvider>
                                </ChannelsProvider>
                              </AllChannelsProvider>
                            </PresencesProvider>
                          </UsersProvider>
                        </WorkspacesProvider>
                      </CreateWorkspaceContext.Provider>
                    </WorkspaceSettingsContext.Provider>
                  </EditPasswordModalProvider>
                </PreferencesContext.Provider>
              </InviteTeammatesContext.Provider>
            </CreateChannelContext.Provider>
          </CreateMessageContext.Provider>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
