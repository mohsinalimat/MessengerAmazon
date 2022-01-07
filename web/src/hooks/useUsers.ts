import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useGraphQLCollection } from 'hooks/useGraphQL';
import { UsersContext } from 'lib/context';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function compareFullName(a: any, b: any) {
  if (a.fullName < b.fullName) {
    return -1;
  }
  if (a.fullName > b.fullName) {
    return 1;
  }
  return 0;
}

export function useUsersByWorkspace() {
  const { user } = useAuth();
  const location = useLocation();
  const idParams = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];

  const [workspaceId, setWorkspaceId] = useState('');
  useEffect(() => {
    if (idParams && idParams !== workspaceId) {
      setWorkspaceId(idParams);
    }
  }, [idParams]);

  const id = workspaceId;

  const { value: valueAWS } = useGraphQLCollection(
    user?.uid,
    queries.GetAllUsers,
    'listUsers',
    subscriptions.OnUpdateUser,
    'onUpdateUser'
  );

  return {
    value: valueAWS
      ?.filter((u: any) => u.workspaces.includes(id))
      ?.sort(compareFullName),
    loading: valueAWS === null,
  };
}

export function useUserById(id?: string) {
  const { value } = useContext(UsersContext);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return {
    value: user,
  };
}
