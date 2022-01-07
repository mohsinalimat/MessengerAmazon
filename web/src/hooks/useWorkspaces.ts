import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import { useGraphQLCollection } from 'hooks/useGraphQL';
import { UserContext, WorkspacesContext } from 'lib/context';
import { useContext, useEffect, useState } from 'react';

export function useMyWorkspaces() {
  const { user } = useContext(UserContext);
  const { value, loading } = useContext(WorkspacesContext);

  return {
    value: value
      ?.filter(
        (w: any) => w.isDeleted === false && w.members.includes(user?.uid)
      )
      ?.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    loading,
  };
}

export function useAllWorkspaces() {
  const { user } = useContext(UserContext);

  const { value: valueAWS } = useGraphQLCollection(
    user?.uid,
    queries.GetAllWorkspaces,
    'listWorkspaces',
    subscriptions.OnUpdateWorkspace,
    'onUpdateWorkspace'
  );

  return {
    value: valueAWS?.filter((w: any) => w.isDeleted === false),
    loading: valueAWS === null,
  };
}

export function useWorkspaceById(id: string) {
  const { value } = useContext(WorkspacesContext);

  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    setWorkspace(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: workspace };
}
