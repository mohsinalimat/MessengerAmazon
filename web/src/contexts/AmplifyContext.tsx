import Amplify, { Auth } from 'aws-amplify';
import { AWS_CONFIG } from 'config';
import React, { createContext, useEffect, useReducer } from 'react';

Amplify.configure(AWS_CONFIG);

const initialState = {
  isAuthenticated: false,
  isInitialized: false,
  user: null as any,
};

const handlers = {
  INITIALIZE: (state: any, action: any) => {
    const { isAuthenticated, user } = action.payload;

    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  },
  LOGIN: (state: any, action: any) => {
    const { user } = action.payload;

    return {
      ...state,
      isAuthenticated: true,
      user,
    };
  },
  LOGOUT: (state: any) => ({
    ...state,
    isAuthenticated: false,
    user: null,
  }),
  REGISTER: (state: any) => ({ ...state }),
  VERIFY_CODE: (state: any) => ({ ...state }),
  RESEND_CODE: (state: any) => ({ ...state }),
  PASSWORD_RECOVERY: (state: any) => ({ ...state }),
  PASSWORD_RESET: (state: any) => ({ ...state }),
};

const reducer = (state: any, action: any) =>
  // @ts-ignore
  handlers[action.type] ? handlers[action.type](state, action) : state;

const AuthContext = createContext({
  ...initialState,
  platform: 'Amplify',
  login: null as any,
  logout: null as any,
  register: null as any,
  verifyCode: null as any,
  resendCode: null as any,
  passwordRecovery: null as any,
  passwordReset: null as any,
});

export const AuthProvider = (props: any) => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();

        // Here you should extract the complete user profile to make it
        // available in your entire app.
        // The auth state only provides basic information.

        dispatch({
          type: 'INITIALIZE',
          payload: {
            isAuthenticated: true,
            user: {
              uid: user.attributes.sub,
              email: user.attributes.email,
              displayName: user.attributes.name,
            },
          },
        });
      } catch (error) {
        dispatch({
          type: 'INITIALIZE',
          payload: {
            isAuthenticated: false,
            user: null,
          },
        });
      }
    };

    initialize();
  }, []);

  const login = async (email: string, password: string) => {
    const user = await Auth.signIn(email, password);

    if (user.challengeName) {
      console.error(
        `Unable to login, because challenge "${user.challengeName}" is mandated and we did not handle this case.`
      );
      return;
    }

    dispatch({
      type: 'LOGIN',
      payload: {
        user: {
          uid: user.attributes.sub,
          email: user.attributes.email,
          displayName: user.attributes.name,
        },
      },
    });
  };

  const logout = async () => {
    await Auth.signOut();
    dispatch({
      type: 'LOGOUT',
    });
  };

  const register = async (email: string, name: string, password: string) => {
    await Auth.signUp({
      username: email,
      password,
      attributes: { email, name },
    });
    dispatch({
      type: 'REGISTER',
    });
  };

  const verifyCode = async (username: string, code: string) => {
    await Auth.confirmSignUp(username, code);
    dispatch({
      type: 'VERIFY_CODE',
    });
  };

  const resendCode = async (username: string) => {
    await Auth.resendSignUp(username);
    dispatch({
      type: 'RESEND_CODE',
    });
  };

  const passwordRecovery = async (username: string) => {
    await Auth.forgotPassword(username);
    dispatch({
      type: 'PASSWORD_RECOVERY',
    });
  };

  const passwordReset = async (
    username: string,
    code: string,
    newPassword: string
  ) => {
    await Auth.forgotPasswordSubmit(username, code, newPassword);
    dispatch({
      type: 'PASSWORD_RESET',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        platform: 'Amplify',
        login,
        logout,
        register,
        verifyCode,
        resendCode,
        passwordRecovery,
        passwordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
