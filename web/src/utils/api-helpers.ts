/* eslint-disable */
import { Auth } from 'aws-amplify';
import { CLIENT_VERSION } from 'config';
import { warn } from 'console';

export const fetcher = async (url: string) => {
  const headers: any = {
    'Content-Type': 'application/json',
    'X-Client-Version': CLIENT_VERSION,
  };
  try {
    const session = await Auth.currentSession();
    const token = session.getAccessToken().getJwtToken();
    headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    console.log('No user');
  }
  const res = await fetch(`${process.env.REACT_APP_API_URL}${url}`, {
    method: 'get',
    headers: headers,
  });
  if (!res.ok) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  }
  return await res.json();
};

export const postData = async (
  url: string,
  data?: {},
  addHeaders?: {},
  warnIfError = true
) => {
  const headers: any = {
    'Content-Type': 'application/json',
    'X-Client-Version': CLIENT_VERSION,
    ...addHeaders,
  };
  try {
    const session = await Auth.currentSession();
    const token = session.getAccessToken().getJwtToken();
    headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    console.log('No user');
  }
  const res = await fetch(`${process.env.REACT_APP_API_URL}${url}`, {
    method: 'post',
    headers: headers,
    body: JSON.stringify(data || {}),
  });
  if (!res.ok && warnIfError) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  } else {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.indexOf('application/json') !== -1)
      return await res.json();
  }
  return;
};

export const deleteData = async (url: string, addHeaders?: {}) => {
  const headers: any = {
    'Content-Type': 'application/json',
    'X-Client-Version': CLIENT_VERSION,
    ...addHeaders,
  };
  try {
    const session = await Auth.currentSession();
    const token = session.getAccessToken().getJwtToken();
    headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    console.log('No user');
  }
  const res = await fetch(`${process.env.REACT_APP_API_URL}${url}`, {
    method: 'delete',
    headers: headers,
  });
  if (!res.ok) {
    const e = await res.json();
    const error = new Error(e.error.message);
    throw error;
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1)
    return await res.json();
  return;
};
