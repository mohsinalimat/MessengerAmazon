import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import useAuth from 'hooks/useAuth';
import { useEffect, useState } from 'react';
import timeDiff from 'utils/time-diff';
import { useGraphQLDocument } from 'hooks/useGraphQL';

export function usePresenceByUserId(id?: string | null) {
  const { user } = useAuth();

  // const { presences, setPresences } = useContext(PresencesContext);
  // useEffect(() => {
  //   if (value) {
  //     const temp = presences.filter((data: any) => data.objectId !== id);
  //     setPresences([...temp, value]);
  //   }
  // }, [value]);

  // const currentPresence = presences.find((data: any) => data.objectId === id);

  const isMe = user?.uid === id;

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { value: currentPresence } = useGraphQLDocument(
    id && !isMe ? id : '',
    queries.GetPresenceById,
    'getPresence',
    subscriptions.OnUpdatePresenceById,
    'onUpdatePresence',
    { objectId: id },
    { objectId: id }
  );

  let isPresent = false;
  if (isMe) isPresent = true;
  else if (currentPresence?.lastPresence)
    isPresent =
      timeDiff(new Date(currentPresence.lastPresence), currentTime) < 35;

  return {
    isPresent,
    loading: currentPresence === null,
  };
}
