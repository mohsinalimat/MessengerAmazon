import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useGraphQLCollection } from 'hooks/useGraphQL';
import { DirectMessagesContext } from 'lib/context';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useDirectMessagesByWorkspace() {
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

  const { value } = useGraphQLCollection(
    id,
    queries.GetDirectsByWorkspace,
    'listDirects',
    subscriptions.OnUpdateDirectByWorkspace,
    'onUpdateDirect',
    {
      filter: {
        workspaceId: {
          eq: id,
        },
      },
    },
    {
      workspaceId: id,
    }
  );

  const [directMessages, setDirectMessages] = useState<any[]>([]);
  useEffect(() => {
    if (value) {
      const temp = directMessages.filter((data: any) => data.w !== id);
      setDirectMessages([
        ...temp,
        {
          w: id,
          data: value?.filter((item: any) => item.active.includes(user?.uid)),
        },
      ]);
    }
  }, [value]);

  return {
    value: directMessages.find((item: any) => item.w === id)?.data,
    loading: value === null,
  };
}

export function useDirectMessageById(id: string) {
  const { value } = useContext(DirectMessagesContext);

  const [directMessage, setDirectMessage] = useState<any>(null);

  useEffect(() => {
    setDirectMessage(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: directMessage };
}
