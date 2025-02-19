import { useCallback, useEffect, useRef } from "react";
import { useStreamingData } from "./use-streaming";
import { CONFIGURATION_DATA, SOLANA_NETWORK_ID } from "../consts";
import {
  fetchBars,
  getAddressFromTicker,
  getAllSymbols,
  getPairs,
  parseFullSymbol,
} from "../datafeed";
import {
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/charting_library";
import { CleanupFunction } from "@codex-data/sdk";

export function useDatafeed(interval?: string) {
  const { subscribe, unsubscribe } = useStreamingData();
  const activeSubscriptions = useRef(new Map<string, CleanupFunction>());
  const lastResolution = useRef<string | null>(null);

  const datafeed = {
    onReady: (callback: any) => {
      console.log("[onReady]: Method call");
      setTimeout(() => callback(CONFIGURATION_DATA), 0);
    },
    searchSymbols: async (
      userInput: string,
      exchange: string,
      symbolType: string,
      onResultReadyCallback: (result: any[]) => void
    ) => {
      try {
        const symbols = await getAllSymbols();
        const matchingSymbols = symbols.filter((symbol) => {
          const symbolName = symbol.full_name.toLowerCase();
          const searchString = userInput.toLowerCase();
          return symbolName.indexOf(searchString) !== -1;
        });
        onResultReadyCallback(matchingSymbols);
      } catch (err) {
        console.error("[searchSymbols]: Error:", err);
        onResultReadyCallback([]);
      }
    },
    resolveSymbol: async (
      symbolName: string,
      onSymbolResolvedCallback: (symbolInfo: any) => void,
      onResolveErrorCallback: (reason: string) => void,
      extension?: any
    ) => {
      console.log("[resolveSymbol]: Method call", symbolName);

      try {
        const symbolParts = parseFullSymbol(symbolName) || {
          fromSymbol: symbolName.split("/")[0],
          toSymbol: "SOL",
          exchange: "Solana",
        };
        console.log("[resolveSymbol]: Symbol parts", symbolParts);
        const address = await getAddressFromTicker(symbolParts.fromSymbol);
        console.log("[resolveSymbol]: Address", address);
        const pairInfo = await getPairs(address);
        console.log("[resolveSymbol]: Pair info", pairInfo);

        const symbolInfo = {
          name: `${symbolParts.fromSymbol}/${symbolParts.toSymbol}`,
          description: "",
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          exchange: symbolParts.exchange,
          minmov: 1,
          pricescale: Math.pow(10, pairInfo.decimals),
          has_intraday: true,
          has_seconds: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: CONFIGURATION_DATA.supported_resolutions,
          volume_precision: 2,
          data_status: "streaming",
          full_name: symbolName,
          listed_exchange: symbolParts.exchange,
          format: "price",
        };

        setTimeout(() => {
          onSymbolResolvedCallback(symbolInfo);
        }, 0);
      } catch (err) {
        console.error("[resolveSymbol]: Error resolving symbol:", err);
        onResolveErrorCallback("unable to resolve symbol");
      }
    },
    getBars: async (
      symbolInfo: any,
      resolution: string,
      periodParams: {
        from: number;
        to: number;
        countBack: number;
        firstDataRequest: boolean;
      },
      onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
      onErrorCallback: (error: string) => void
    ) => {
      console.log("[getBars]: Method call", symbolInfo, resolution);

      try {
        const symbol = symbolInfo.name.split("/")[0];
        const address = getAddressFromTicker(symbol);

        const barsData = await fetchBars(
          `${address}:${SOLANA_NETWORK_ID}`,
          resolution,
          periodParams.from,
          periodParams.to
        );

        if (!barsData || !barsData.t || barsData.t.length === 0) {
          console.log("[getBars]: No data found");
          onHistoryCallback([], { noData: true });
          return;
        }

        const formattedBars = barsData.t.map(
          (timestamp: number, index: number) => {
            const open = barsData.o?.[index] ? Number(barsData.o[index]) : 0;
            const high = barsData.h?.[index] ? Number(barsData.h[index]) : 0;
            const low = barsData.l?.[index] ? Number(barsData.l[index]) : 0;
            const close = barsData.c?.[index] ? Number(barsData.c[index]) : 0;
            const volume = barsData.v?.[index] ? Number(barsData.v[index]) : 0;

            return {
              time: timestamp * 1000,
              open,
              high,
              low,
              close,
              volume,
            };
          }
        );

        console.log("[getBars]: Formatted bars", formattedBars);

        onHistoryCallback(formattedBars, { noData: false });
      } catch (err) {
        console.error("[getBars]: Error getting bars:", err);
        if (err instanceof Error) {
          onErrorCallback(`Failed to load bars. Error: ${err.message}`);
        } else {
          onErrorCallback("Failed to load bars. Unknown error.");
        }
      }
    },
    subscribeBars: async (
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: SubscribeBarsCallback,
      subscriberUID: string,
      onResetCacheNeededCallback: () => void
    ) => {
      console.log(
        "Subscribing to bars:",
        subscriberUID,
        "resolution:",
        resolution
      );
      const subscription = await subscribe(
        symbolInfo,
        resolution,
        onTick,
        subscriberUID
      );
      activeSubscriptions.current.set(subscriberUID, subscription);
    },
    unsubscribeBars: (subscriberUID: string) => {
      console.log("Unsubscribing from bars:", subscriberUID);
      unsubscribe(subscriberUID);
    },
  };

  useEffect(() => {
    const resolution = interval || "1S";
    lastResolution.current = resolution;
  }, [interval]);

  return datafeed;
}
