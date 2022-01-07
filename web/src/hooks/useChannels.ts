import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useGraphQLCollection } from 'hooks/useGraphQL';
import { ChannelsContext } from 'lib/context';
import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function compareName(a: any, b: any) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export function useChannelsByWorkspace() {
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
    queries.GetChannelsByWorkspace,
    'listChannels',
    subscriptions.OnUpdateChannelByWorkspace,
    'onUpdateChannel',
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

  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    if (value) {
      const temp = channels.filter((data: any) => data.w !== id);
      setChannels([
        ...temp,
        {
          w: id,
          data: value
            ?.filter((c: any) => c.isDeleted === false)
            ?.sort(compareName),
        },
      ]);
    }
  }, [value]);

  return {
    value: channels.find((data: any) => data.w === id)?.data,
    loading: value === null,
  };
}

export function useChannels() {
  const { user } = useAuth();
  const { value } = useContext(ChannelsContext);

  return {
    value: value?.filter(
      (c: any) => c.members.includes(user?.uid) && c.isArchived === false
    ),
  };
}

export function useChannelById(id: string) {
  const { value } = useContext(ChannelsContext);

  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    setChannel(value?.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: channel };
}
