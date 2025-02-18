import { CleanupFunction, Codex } from "@codex-data/sdk";
import { OnBarsUpdatedResponse } from "@codex-data/sdk/dist/resources/graphql";
import { CODEX_API_KEY, SOLANA_NETWORK_ID } from "./consts";
import {
  Bar,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/charting_library";
import { useRef } from "react";
import { getAddressFromTicker } from "./datafeed";

interface OnUnconfirmedBarsUpdatedMeta {
  onUnconfirmedBarsUpdated: {
    aggregates: {
      r1S: {
        t: number;
        o: string;
        h: string;
        l: string;
        c: string;
        volume: string;
      };
    };
  };
}

export const channelToSubscription = new Map<
  string,
  {
    symbol: string;
    subscriberUID: string;
    resolution: ResolutionString;
    lastBar: Bar | undefined;
    handlers: {
      id: string;
      callback: SubscribeBarsCallback;
    }[];
  }
>();

export function createSubscription(
  symbolInfo: LibrarySymbolInfo,
  resolution: ResolutionString,
  onTick: (bar: Bar) => void,
  subscriberUID: string
) {
  const formattedSymbol = `${getAddressFromTicker(
    symbolInfo.ticker || symbolInfo.name
  )}:${SOLANA_NETWORK_ID}`;

  let subscriptionItem = channelToSubscription.get(formattedSymbol);
  const handler = {
    id: subscriberUID,
    callback: onTick,
  };

  if (subscriptionItem) {
    subscriptionItem.handlers.push(handler);
    return;
  }

  subscriptionItem = {
    symbol: formattedSymbol,
    subscriberUID,
    resolution,
    lastBar: undefined,
    handlers: [handler],
  };
  channelToSubscription.set(subscriberUID, subscriptionItem);

  const subscription = subscribeOnStream(formattedSymbol);
  return subscription;
}

export function subscribeOnStream(symbol: string, codex?: Codex) {
  const client = codex || new Codex(CODEX_API_KEY);

  return client.subscribe<OnUnconfirmedBarsUpdatedMeta, { pairId: string }>(
    `subscription OnUnconfirmedBarsUpdated($pairId: String) {
            onUnconfirmedBarsUpdated(pairId: $pairId, quoteToken: token0) {
              aggregates {
                r1S {
                  c
                  h
                  l
                  o
                  t
                  v
                  volume
                }
              }
            }
          }`,
    { pairId: symbol },
    {
      next: ({ data }) => {
        if (data) {
          const bar = handleBarUpdate(data);
          console.log("[next]:", bar);
          if (bar) {
            const subscriptionItem = channelToSubscription.get(symbol);
            if (subscriptionItem) {
              subscriptionItem.lastBar = bar;
              subscriptionItem.handlers.forEach((handler) =>
                handler.callback(bar)
              );
            }
            console.log("[next]: Subscriptions updated.");
          }
        }
      },
      error: (err) => {
        console.error("Subscription error:", err);
      },
      complete: () => {
        console.log("Subscription completed");
      },
    }
  );
}

const handleBarUpdate = (data: OnUnconfirmedBarsUpdatedMeta) => {
  if (!data?.onUnconfirmedBarsUpdated?.aggregates?.r1S) return;

  const token = data.onUnconfirmedBarsUpdated.aggregates.r1S;

  const bar: Bar = {
    time: token.t * 1000, // Convert to milliseconds
    open: Number(token.o),
    high: Number(token.h),
    low: Number(token.l),
    close: Number(token.c),
    volume: token.volume ? Number(token.volume) : 0,
  };

  return bar;
};

export function unsubscribeFromStream(id: string) {
  for (const [symbol, subscriptionItem] of channelToSubscription.entries()) {
    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler: { id: string }) => handler.id === id
    );

    if (handlerIndex !== -1) {
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        channelToSubscription.delete(symbol);
      }
      break;
    }
  }
}

/*
export function useChartStream(symbol: string, codex?: Codex) {
  const activeSubscriptions = useRef(new Map<string, CleanupFunction>());
  const subscriptionCallbacks = useRef(
    new Map<string, SubscribeBarsCallback>()
  );

  function createSubscription(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    subscriberUID: string
  ) {
    const formattedSymbol = `${getAddressFromTicker(
      symbolInfo.name
    )}:${SOLANA_NETWORK_ID}`;
    const subscription = subscribeOnStream(formattedSymbol);

    return subscription;
  }

  function unsubscribeFromStream(id: string, subscription: any) {
    if (subscription) {
      console.log("Unsubscribing from bars:", id);
      subscription();
    }
  }

  function subscribeOnStream(symbol: string) {
    const client = codex || new Codex(CODEX_API_KEY);

    return client.subscribe<OnUnconfirmedBarsUpdatedMeta, { pairId: string }>(
      `subscription OnUnconfirmedBarsUpdated($pairId: String) {
            onUnconfirmedBarsUpdated(pairId: $pairId, quoteToken: token0) {
              aggregates {
                r1S {
                  c
                  h
                  l
                  o
                  t
                  v
                  volume
                }
              }
            }
          }`,
      { pairId: symbol },
      {
        next: ({ data }) => {
          if (data) {
            console.log("data", data);
            handleBarUpdate(data);
          }
        },
        error: (err) => {
          console.error("Subscription error:", err);
        },
        complete: () => {
          console.log("Subscription completed");
        },
      }
    );
  }

  const handleBarUpdate = (data: OnUnconfirmedBarsUpdatedMeta) => {
    if (!data?.onUnconfirmedBarsUpdated?.aggregates?.r1S) return;

    const token = data.onUnconfirmedBarsUpdated.aggregates.r1S;

    const bar: Bar = {
      time: token.t * 1000, // Convert to milliseconds
      open: Number(token.o),
      high: Number(token.h),
      low: Number(token.l),
      close: Number(token.c),
      volume: token.volume ? Number(token.volume) : 0,
    };

    subscriptionCallbacks.current.forEach((callback) => callback(bar));
  };

  return {
    createSubscription,
    unsubscribeFromStream,
  };
}
  */
