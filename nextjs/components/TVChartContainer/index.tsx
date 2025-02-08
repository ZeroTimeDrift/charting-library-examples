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
  SubscribeBarsCallback,
  ResolveCallback,
} from "@/public/static/charting_library";
import { CleanupFunction, Codex } from "@codex-data/sdk";
import {
  OnBarsUpdatedResponse,
  Price,
  QuoteToken,
  BarsResponse,
} from "@codex-data/sdk/dist/resources/graphql";

interface OnBarsUpdatedMeta {
  onBarsUpdated: OnBarsUpdatedResponse;
}

export const TVChartContainer = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";
  const PAIR_ID = "8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj:1399811149";

  const activeSubscriptions = useRef(new Map<string, CleanupFunction>());
  const subscriptionCallbacks = useRef(
    new Map<string, SubscribeBarsCallback>()
  );

  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const sdk = new Codex(DEFINED_API_KEY);

  const transformToTradingViewBars = (data: BarsResponse): Bar[] => {
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

  const handleBarUpdate = (data: OnBarsUpdatedMeta) => {
    console.log("handleBarUpdate", data.onBarsUpdated);
    if (!data || !data.onBarsUpdated.aggregates?.r1?.token) return;

    const token = data.onBarsUpdated.aggregates.r1.token;
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
            // @ts-expect-error - Types are weirdly mismatched?
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
      symbol: "SOL",
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: {
        onReady: (callback) => {
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
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true,
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
        resolveSymbol: (
          symbolName: string,
          onResolve: ResolveCallback,
          onError: DatafeedErrorCallback
        ) => {
          setTimeout(() => {
            onResolve({
              name: symbolName,
              ticker: symbolName,
              type: "crypto",
              session: "24x7",
              timezone: "Etc/UTC",
              exchange: "Raydium",
              minmov: 1,
              pricescale: 100,
              has_intraday: true,
              has_seconds: true,
              has_ticks: true,
              has_daily: true,
              has_weekly_and_monthly: true,
              has_empty_bars: true,
              listed_exchange: "Raydium",
              volume_precision: 8,
              data_status: "streaming",
              intraday_multipliers: ["1", "5", "15", "30", "60", "240"],
              seconds_multipliers: ["1", "5"],
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
              description: "",
              currency_code: "USDC",
              format: "price",
            });
          }, 0);
        },
        getBars: async (
          symbolInfo: LibrarySymbolInfo,
          resolution: ResolutionString,
          periodParams: PeriodParams,
          onResult: HistoryCallback,
          onError: DatafeedErrorCallback
        ) => {
          try {
            const resolutionMap: { [key: string]: number } = {
              "1S": 1,
              "5S": 5,
              "1": 60,
              "5": 300,
              "15": 900,
              "30": 1800,
              "60": 3600,
              "240": 14400,
              D: 86400,
              W: 604800,
            };

            const resolutionInSeconds = resolutionMap[resolution] || 60;
            const maxDataPoints = 1500;
            const timeRange = maxDataPoints * resolutionInSeconds;

            // Convert TradingView's millisecond timestamps to seconds
            let to = periodParams.to
              ? Math.floor(periodParams.to / 1000)
              : Math.floor(Date.now() / 1000);
            let from = periodParams.from
              ? Math.floor(periodParams.from / 1000)
              : to - timeRange;

            // Ensure 'from' is not greater than 'to'
            if (from >= to) {
              console.warn(
                "Invalid time range detected, adjusting 'from' value"
              );
              from = to - timeRange;
            }

            // Ensure we don't exceed the max data points
            const actualTimeRange = to - from;
            if (actualTimeRange > timeRange) {
              from = to - timeRange;
            }

            console.log(
              `Fetching bars from ${from} to ${to} with resolution ${resolution}`
            );

            const response = await sdk.queries.getBars({
              symbol: PAIR_ID,
              from,
              to,
              resolution: resolution.replace("S", ""), // Remove 'S' suffix for seconds
              removeEmptyBars: true,
            });

            console.log("GetBars response:", response);

            if (!response.getBars) {
              onResult([], { noData: true });
              return;
            }

            const bars = transformToTradingViewBars(response.getBars);
            console.log("Trading View Bars:", bars);
            onResult(bars, {
              noData: bars.length === 0,
              nextTime: periodParams.firstDataRequest
                ? undefined
                : bars[0]?.time,
            });
          } catch (err) {
            console.error("Error fetching bars:", err);
            if (err instanceof Error) {
              onError(err.message);
            } else {
              onError(err as string);
            }
          }
        },
        subscribeBars: (
          symbolInfo: LibrarySymbolInfo,
          resolution: ResolutionString,
          onTick: SubscribeBarsCallback,
          subscriberUID: string
        ) => {
          console.log(
            "Subscribing to bars:",
            subscriberUID,
            "resolution:",
            resolution
          );
          subscriptionCallbacks.current.set(subscriberUID, onTick);
          const subscription = createSubscription(subscriberUID);
          activeSubscriptions.current.set(subscriberUID, subscription);
        },
        unsubscribeBars: (subscriberUID: any) => {
          const subscription = activeSubscriptions.current.get(subscriberUID);
          if (subscription) {
            console.log("Unsubscribing from bars:", subscriberUID);
            subscription();
            activeSubscriptions.current.delete(subscriberUID);
            subscriptionCallbacks.current.delete(subscriberUID);
          }
        },
      },
      interval:
        (props.interval as ResolutionString) || ("1S" as ResolutionString),
      container: chartContainerRef.current,
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
      disabled_features: [
        "use_localstorage_for_settings",
        "timeframes_toolbar",
        "volume_force_overlay",
        "create_volume_indicator_by_default",
      ],
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
        subscription();
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
