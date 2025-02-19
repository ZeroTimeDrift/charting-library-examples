import {
  Bar,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/charting_library";
import { Codex } from "@codex-data/sdk";
import { CODEX_API_KEY } from "./consts";
import { getAddressFromTicker } from "./datafeed";

let codexClient: Codex | null = null;
const subscriptionCallbacks = new Map<string, SubscribeBarsCallback>();
const activeSubscriptions = new Map<string, () => void>();

export interface OnUnconfirmedBarsUpdatedMeta {
  onUnconfirmedBarsUpdated: {
    aggregates: {
      r1S: {
        t: number;
        o: string;
        h: string;
        l: string;
        c: string;
        v: string;
      };
    };
  };
}

function handleBarUpdate(
  data: OnUnconfirmedBarsUpdatedMeta,
  subscriberUID: string
) {
  if (!data?.onUnconfirmedBarsUpdated?.aggregates?.r1S) return;

  const token = data.onUnconfirmedBarsUpdated.aggregates.r1S;
  const callback = subscriptionCallbacks.get(subscriberUID);

  if (!callback) return;

  const bar: Bar = {
    time: token.t * 1000,
    open: Number(token.o),
    high: Number(token.h),
    low: Number(token.l),
    close: Number(token.c),
    volume: Number(token.v || 0),
  };

  callback(bar);
}

export async function createSubscription(
  symbolInfo: LibrarySymbolInfo,
  resolution: ResolutionString,
  onTick: SubscribeBarsCallback,
  subscriberUID: string
) {
  if (!codexClient) {
    codexClient = new Codex(CODEX_API_KEY);
  }

  // Store the callback for this subscriber
  subscriptionCallbacks.set(subscriberUID, onTick);

  const address = await getAddressFromTicker(symbolInfo.name.split("/")[0]);

  const cleanup = codexClient.subscribe<
    OnUnconfirmedBarsUpdatedMeta,
    { pairId: string }
  >(
    `subscription OnUnconfirmedBarsUpdated($pairId: String) {
            onUnconfirmedBarsUpdated(pairId: $pairId) {
                aggregates {
                    r1S {
                        t
                        o
                        h
                        l
                        c
                        v
                    }
                }
            }
        }`,
    { pairId: `${address}:${symbolInfo.exchange}` },
    {
      next: ({ data }) => {
        if (data) {
          console.log("Received streaming data:", data);
          handleBarUpdate(data, subscriberUID);
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

  activeSubscriptions.set(subscriberUID, cleanup);
  return cleanup;
}

export function unsubscribeFromStream(subscriberUID: string) {
  const cleanup = activeSubscriptions.get(subscriberUID);
  if (cleanup) {
    cleanup();
    activeSubscriptions.delete(subscriberUID);
    subscriptionCallbacks.delete(subscriberUID);
  }
}
