import { API } from 'aws-amplify';
import * as queries from 'graphql/queries';
import * as subscriptions from 'graphql/subscriptions';
import { MessagesContext } from 'lib/context';
import { useContext, useEffect, useRef, useState } from 'react';

function compareDate(a: any, b: any) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function useGraphQLCollection(
  key: string | null,
  page: number,
  listQuery: string,
  listQueryName: string,
  updateSubscription: string,
  updateSubscriptionName: string,
  listQueryVariables?: any,
  updateSubscriptionVariables?: any
) {
  const [value, setValue] = useState<any>(null);

  const dataRef = useRef<any>(null);
  const nextTokenRef = useRef<any>(null);

  const onUpdateRef = useRef<any>(null);

  const prev = useRef('');

  useEffect(() => {
    if (key && prev.current !== key) {
      prev.current = key;

      (async () => {
        onUpdateRef.current?.unsubscribe();

        // Initial query to fetch data
        const lists: any = await API.graphql({
          query: listQuery,
          ...(listQueryVariables && {
            variables: { ...listQueryVariables, limit: 30 },
          }),
        });
        dataRef.current = lists.data[listQueryName].items;
        nextTokenRef.current = lists.data[listQueryName].nextToken;
        setValue(dataRef.current);

        // Trigger on each update
        onUpdateRef.current = API.graphql({
          query: updateSubscription,
          ...(updateSubscriptionVariables && {
            variables: updateSubscriptionVariables,
          }),
          // @ts-ignore
        }).subscribe({
          next: (data: any) => {
            const val = data.value.data[updateSubscriptionName];

            // Do not update the messages data if the date of the message is older than the last one
            if (
              dataRef.current?.length &&
              new Date(val.createdAt).getTime() <
                new Date(
                  dataRef.current.sort(compareDate)[
                    dataRef.current.length - 1
                  ].createdAt
                ).getTime()
            ) {
              return;
            }

            dataRef.current = [
              ...dataRef.current.filter(
                (u: any) => u.objectId !== val.objectId
              ),
              val,
            ];
            setValue(dataRef.current);
          },
          error: (error: any) => console.warn(error),
        });
      })();
    }
  }, [key]);

  useEffect(() => {
    if (page > 1) {
      (async () => {
        const lists: any = await API.graphql({
          query: listQuery,
          ...(listQueryVariables && {
            variables: {
              ...listQueryVariables,
              nextToken: nextTokenRef.current,
              limit: 30,
            },
          }),
        });
        dataRef.current = [
          ...lists.data[listQueryName].items,
          ...dataRef.current,
        ];
        nextTokenRef.current = lists.data[listQueryName].nextToken;
        setValue(dataRef.current);
      })();
    }
  }, [page]);

  useEffect(
    () => () => {
      onUpdateRef.current?.unsubscribe();
    },
    []
  );

  return {
    value,
  };
}

export function useMessagesByChat(
  id: string,
  page = 1 // eslint-disable-line
) {
  const { messages, setMessages } = useContext(MessagesContext);

  const { value } = useGraphQLCollection(
    id,
    page,
    queries.GetMessages,
    'listMessages',
    subscriptions.onUpdateMessage,
    'onUpdateMessage',
    {
      chatId: id,
    },
    {
      chatId: id,
    }
  );

  useEffect(() => {
    if (value) {
      const temp = messages.filter((data: any) => data.c !== id);
      setMessages([
        ...temp,
        {
          c: id,
          data: value
            .filter((message: any) => !message.isDeleted)
            ?.sort(compareDate),
        },
      ]);
    }
  }, [value]);

  return {
    value: messages.find((data: any) => data.c === id)?.data,
    loading: value === null,
  };
}
