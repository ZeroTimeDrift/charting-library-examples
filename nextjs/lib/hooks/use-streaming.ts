import { useCallback, useEffect, useRef } from "react";
import {
  Bar,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/charting_library";
import { Codex } from "@codex-data/sdk";
import {
  CODEX_API_KEY,
  RAYDIUM_AMM_ADDRESS,
  RAYDIUM_CLMM_ADDRESS,
  SOLANA_NETWORK_ID,
} from "../consts";
import { getAddressFromTicker } from "../datafeed";

interface OnUnconfirmedBarsUpdatedMeta {
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

export function useStreamingData() {
  const codexClient = useRef<Codex | null>(null);
  const subscriptionCallbacks = useRef(
    new Map<string, SubscribeBarsCallback>()
  );
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    codexClient.current = new Codex(CODEX_API_KEY);
    return () => {};
  }, []);

  const handleBarUpdate = useCallback(
    (data: OnUnconfirmedBarsUpdatedMeta, subscriberUID: string) => {
      if (!data?.onUnconfirmedBarsUpdated?.aggregates?.r1S) return;

      const token = data.onUnconfirmedBarsUpdated.aggregates.r1S;
      const callback = subscriptionCallbacks.current.get(subscriberUID);

      if (!callback) return;

      // Create bar in TradingView format
      const bar: Bar = {
        time: token.t * 1000, // Convert to milliseconds
        open: Number(token.o),
        high: Number(token.h),
        low: Number(token.l),
        close: Number(token.c),
        volume: token.v ? Number(token.v) : 0,
      };

      subscriptionCallbacks.current.forEach((callback) => callback(bar));
    },
    []
  );

  const subscribe = useCallback(
    async (
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: SubscribeBarsCallback,
      subscriberUID: string
    ) => {
      if (!codexClient.current) {
        console.error("Codex client not initialized");
        return () => {};
      }

      console.log(
        "Subscribing to bars:",
        subscriberUID,
        "resolution:",
        resolution
      );

      // Store the callback for this subscriber
      subscriptionCallbacks.current.set(subscriberUID, onTick);

      const address = getAddressFromTicker(symbolInfo.name.split("/")[0]);

      const pairs = await codexClient.current.queries.listPairsForToken({
        networkId: SOLANA_NETWORK_ID,
        tokenAddress: address,
      });

      let bestPairs = pairs.listPairsForToken.filter(
        (pair) =>
          pair &&
          (pair?.exchangeHash === RAYDIUM_AMM_ADDRESS ||
            pair?.exchangeHash === RAYDIUM_CLMM_ADDRESS)
      );

      if (bestPairs) {
        bestPairs = bestPairs?.sort(
          (a, b) =>
            parseFloat(b?.pooled?.token0 || "0") -
            parseFloat(a?.pooled?.token0 || "0")
        );
      }

      console.log("[subscribe]: Pairs", pairs);
      console.log("[subscribe]: Best pairs", bestPairs);

      return codexClient.current.subscribe<
        OnUnconfirmedBarsUpdatedMeta,
        { pairId: string }
      >(
        `subscription OnUnconfirmedBarsUpdated($pairId: String) {
                onUnconfirmedBarsUpdated(pairId: $pairId, quoteToken: token0) {
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
        { pairId: bestPairs?.[0]?.id || "" },
        {
          next: ({ data }) => {
            console.log("Received streaming data:", data);
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
    },
    [handleBarUpdate]
  );

  const unsubscribe = useCallback((subscriberUID: string) => {
    console.log("Unsubscribing from bars:", subscriberUID);
    // subscriptionCallbacks.current.delete(subscriberUID);
  }, []);

  return {
    subscribe,
    unsubscribe,
  };
}
