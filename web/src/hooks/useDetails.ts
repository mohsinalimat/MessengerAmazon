import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useGraphQLCollection } from 'hooks/useGraphQL';
import { DetailsContext } from 'lib/context';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import createKey from 'utils/create-key';

export function useDetailsByWorkspace() {
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
    createKey([id, user?.uid]),
    queries.GetDetailsByWorkspace,
    'listDetails',
    subscriptions.onUpdateDetail,
    'onUpdateDetail',
    {
      filter: {
        workspaceId: {
          eq: id,
        },
        userId: {
          eq: user?.uid,
        },
      },
    },
    {
      workspaceId: id,
      userId: user?.uid,
    }
  );

  const [details, setDetails] = useState<any[]>([]);
  useEffect(() => {
    if (value) {
      const temp = details.filter((data: any) => data.w !== id);
      setDetails([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return {
    value: details.find((data: any) => data.w === id)?.data,
    loading: value === null,
  };
}

export function useDetailByChat(id: string) {
  const { value } = useContext(DetailsContext);

  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!value?.length) return;
    setDetail(value.find((p: any) => p.chatId === id));
  }, [value, id]);

  return { value: detail };
}
