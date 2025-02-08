import styles from "./index.module.css";
import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
  IDatafeedChartApi,
  LibrarySymbolInfo,
  PeriodParams,
  HistoryCallback,
  DatafeedErrorCallback,
  Bar,
} from "@/public/static/charting_library";
import { Codex } from "@codex-data/sdk";
import {
  OnBarsUpdatedResponse,
  Price,
  QuoteToken,
} from "@codex-data/sdk/dist/resources/graphql";

export const TVChartContainer = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";
  const PAIR_ID = "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae:56";

  const activeSubscriptions = useRef(new Map());
  const subscriptionCallbacks = useRef(new Map());
  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const sdk = new Codex(DEFINED_API_KEY);

  const transformToTradingViewBars = (data: any): Bar[] => {
    if (!data || !Array.isArray(data.t)) {
      return [];
    }

    return data.t.map((time: number, i: number) => ({
      time: time * 1000,
      open: Number(data.o[i]),
      high: Number(data.h[i]),
      low: Number(data.l[i]),
      close: Number(data.c[i]),
      volume: data.v ? Number(data.v[i]) : undefined,
    }));
  };

  const handleBarUpdate = (data: OnBarsUpdatedResponse) => {
    if (!data?.aggregates?.r1?.token) return;

    const token = data.aggregates.r1.token;
    const bar: Bar = {
      time: token.t * 1000,
      open: Number(token.o),
      high: Number(token.h),
      low: Number(token.l),
      close: Number(token.c),
      volume: token.volume ? Number(token.volume) : undefined,
    };

    subscriptionCallbacks.current.forEach((callback) => {
      callback(bar);
    });
  };

  const createSubscription = (subscriberUID: string) => {
    return sdk.subscribe<OnBarsUpdatedResponse, { pairId: string }>(
      `subscription OnBarsUpdated($pairId: String) {
        onBarsUpdated(pairId: $pairId) {
          eventSortKey
          networkId
          pairAddress
          pairId
          timestamp
          quoteToken
          aggregates {
            r1 { 
              t 
              token { 
                t 
                o 
                h 
                l 
                c 
                volume 
              } 
            }
          }
        }
      }`,
      { pairId: PAIR_ID },
      {
        next: ({ data }) => {
          if (data) {
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
  };

  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      enabled_features: ["seconds_resolution", "tick_resolution"],
      symbol: props.symbol || PAIR_ID,
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: {
        onReady: (callback: any) => {
          setTimeout(
            () =>
              callback({
                supported_resolutions: [
                  "1S",
                  "5S",
                  "1",
                  "5",
                  "15",
                  "30",
                  "60",
                  "240",
                  "D",
                  "W",
                ].map((res) => res as ResolutionString),
              }),
            0
          );
        },
        searchSymbols: (
          userInput: any,
          exchange: any,
          symbolType: any,
          onResult: any
        ) => {
          onResult([]);
        },
        resolveSymbol: (symbolName: any, onResolve: any, onError: any) => {
          setTimeout(() => {
            onResolve({
              name: symbolName,
              ticker: symbolName,
              type: "crypto",
              session: "24x7",
              timezone: "Etc/UTC",
              exchange: "",
              minmov: 1,
              pricescale: 100,
              has_intraday: true,
              has_seconds: true,
              intraday_multipliers: ["1", "5", "15", "30", "60"],
              seconds_multipliers: ["1S"],
              has_daily: true,
              has_weekly_and_monthly: true,
              has_empty_bars: true,
              volume_precision: 8,
              description: "",
              listed_exchange: "",
              format: "price",
            });
          }, 0);
        },
        getBars: async (
          symbolInfo: any,
          resolution: any,
          periodParams: any,
          onResult: any,
          onError: any
        ) => {
          try {
            const currentTime = Math.floor(Date.now() / 1000);
            const twoHoursAgo = currentTime - 7200; // 2 hrs

            const response = await sdk.queries.getBars({
              symbol: PAIR_ID,
              from: twoHoursAgo,
              to: currentTime,
              resolution: "1S",
            });

            if (!response.getBars) {
              onResult([], { noData: true });
              return;
            }

            const bars = transformToTradingViewBars(response.getBars);
            onResult(bars, { noData: bars.length === 0 });
          } catch (err) {
            console.error("Error fetching bars:", err);
            onError(err);
          }
        },
        subscribeBars: (
          symbolInfo: any,
          resolution: any,
          onTick: any,
          subscriberUID: any
        ) => {
          console.log("Subscribing to bars:", subscriberUID);
          subscriptionCallbacks.current.set(subscriberUID, onTick);
          const subscription = createSubscription(subscriberUID);
          activeSubscriptions.current.set(subscriberUID, subscription);
        },
        unsubscribeBars: (subscriberUID: any) => {
          const subscription = activeSubscriptions.current.get(subscriberUID);
          if (subscription) {
            subscription.unsubscribe();
            activeSubscriptions.current.delete(subscriberUID);
            subscriptionCallbacks.current.delete(subscriberUID);
          }
        },
      },
      interval: (props.interval as ResolutionString) || "1S",
      container: chartContainerRef.current,
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
      disabled_features: ["use_localstorage_for_settings"],
      charts_storage_url: props.charts_storage_url,
      charts_storage_api_version: props.charts_storage_api_version,
      client_id: props.client_id,
      user_id: props.user_id,
      fullscreen: props.fullscreen,
      autosize: props.autosize,
    };

    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(() => {
      tvWidget.headerReady().then(() => {
        const button = tvWidget.createButton();
        button.setAttribute("title", "Click to show a notification popup");
        button.classList.add("apply-common-tooltip");
        button.addEventListener("click", () =>
          tvWidget.showNoticeDialog({
            title: "Notification",
            body: "TradingView Charting Library API works correctly",
            callback: () => {
              console.log("Noticed!");
            },
          })
        );
        button.innerHTML = "Check API";
      });
    });

    return () => {
      // Cleanup subscriptions
      activeSubscriptions.current.forEach((subscription) => {
        subscription.unsubscribe();
      });
      activeSubscriptions.current.clear();
      subscriptionCallbacks.current.clear();
      tvWidget.remove();
    };
  }, [props]);

  return (
    <>
      <header className={styles.VersionHeader}>
        <h1>TradingView Charting Library and Next.js Integration Example</h1>
      </header>
      <div ref={chartContainerRef} className={styles.TVChartContainer} />
    </>
  );
};
