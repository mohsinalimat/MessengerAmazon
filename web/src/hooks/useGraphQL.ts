/* eslint-disable */
import { API } from 'aws-amplify';
import { useEffect, useRef, useState } from 'react';

export function useGraphQLCollection(
  key: string | null,
  listQuery: string,
  listQueryName: string,
  updateSubscription: string,
  updateSubscriptionName: string,
  listQueryVariables?: any,
  updateSubscriptionVariables?: any
) {
  const [value, setValue] = useState<any>(null);

  const dataRef = useRef<any>(null);

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
          ...(listQueryVariables && { variables: listQueryVariables }),
        });
        dataRef.current = lists.data[listQueryName].items;
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

export function useGraphQLDocument(
  key: string,
  getQuery: string,
  getQueryName: string,
  updateSubscription: string,
  updateSubscriptionName: string,
  getQueryVariables?: any,
  updateSubscriptionVariables?: any
) {
  const [value, setValue] = useState<any>(null);

  const dataRef = useRef<any>(null);

  const onUpdateRef = useRef<any>(null);

  const prev = useRef('');

  useEffect(() => {
    if (key && prev.current !== key) {
      prev.current = key;

      (async () => {
        onUpdateRef.current?.unsubscribe();

        const res: any = await API.graphql({
          query: getQuery,
          ...(getQueryVariables && { variables: getQueryVariables }),
        });
        setValue(res.data[getQueryName]);

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
            dataRef.current = val;
            setValue(dataRef.current);
          },
          error: (error: any) => console.warn(error),
        });
      })();
    }
  }, [key]);

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
