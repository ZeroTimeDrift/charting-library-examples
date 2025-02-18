/*
import styles from "./index.module.css";
import { useEffect, useRef, useCallback } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
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
  BarsResponse,
} from "@codex-data/sdk/dist/resources/graphql";

interface OnBarsUpdatedMeta {
  onBarsUpdated: OnBarsUpdatedResponse;
}

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

export const TVChartContainer = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";
  const PAIR_ID = "EtcwBb9fT7YYAgpkVz6AG1QZwPJxS79Tg2r7TszYuP72:1399811149";
  // For historical data
  const API_ENDPOINT = "https://api.codex.io/graphql";

  const activeSubscriptions = useRef(new Map<string, CleanupFunction>());
  const subscriptionCallbacks = useRef(
    new Map<string, SubscribeBarsCallback>()
  );
  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const lastResolution = useRef<string | null>(null);
  const lastBarRef = useRef<Bar | null>(null);
  const sdkRef = useRef<Codex | null>(null);
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const latestTimestampRef = useRef<number>(0);

  useEffect(() => {
    sdkRef.current = new Codex(DEFINED_API_KEY);
    return () => {
      // TODO: cleanup?
    };
  }, []);

  const handleBarUpdate = useCallback((data: OnUnconfirmedBarsUpdatedMeta) => {
    if (!data?.onUnconfirmedBarsUpdated?.aggregates?.r1S) return;

    const token = data.onUnconfirmedBarsUpdated.aggregates.r1S;

    // Create bar in TradingView format - using r1S (1-second) data
    const bar: Bar = {
      time: token.t * 1000, // Convert to milliseconds
      open: Number(token.o),
      high: Number(token.h),
      low: Number(token.l),
      close: Number(token.c),
      volume: token.volume ? Number(token.volume) : 0,
    };

    // Send update to all subscribers
    subscriptionCallbacks.current.forEach((callback) => callback(bar));
  }, []);

  const createSubscription = useCallback(
    (subscriberUID: string) => {
      if (!sdkRef.current) return () => {};

      return sdkRef.current.subscribe<
        OnUnconfirmedBarsUpdatedMeta,
        { pairId: string }
      >(
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
        { pairId: PAIR_ID },
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
    },
    [handleBarUpdate]
  );

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

  const fetchHistoricalData = async (
    from: number,
    to: number,
    resolution: string
  ): Promise<BarsResponse | null> => {
    try {
      const params = new URLSearchParams({
        symbol: PAIR_ID,
        from: from.toString(),
        to: to.toString(),
        resolution: resolution,
      });

      const response = await fetch(`/api/bars?${params}`);

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        return null;
      }

      const data = await response.json();
      return data as BarsResponse;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return null;
    }
  };

  const getBars = async (
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ) => {
    try {
      const to = periodParams.to
        ? Math.floor(periodParams.to / 1000)
        : Math.floor(Date.now() / 1000);
      const from = periodParams.from
        ? Math.floor(periodParams.from / 1000)
        : to - 24 * 60 * 60; // 24hrs

      console.log(to, from);

      const data = await fetchHistoricalData(from, to, resolution);

      if (!data) {
        onResult([], { noData: true });
        return;
      }

      const bars = transformToTradingViewBars(data);
      onResult(bars, { noData: bars.length === 0 });
    } catch (err) {
      console.error("Error fetching bars:", err);
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    const resolution = props.interval || "1S";
    lastResolution.current = resolution;
  }, [props.interval]);

  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      container: chartContainerRef.current,
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
              pricescale: 10000,
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
              seconds_multipliers: ["1", "5", "15"],
              supported_resolutions: [
                "1S",
                "5S",
                "15S",
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
        getBars: getBars,
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
      interval: "1S" as ResolutionString,
      timeframe: "1H", // TODO: experiment w/ this
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
      disabled_features: [
        "use_localstorage_for_settings",
        "volume_force_overlay",
      ],
      enabled_features: [
        "seconds_resolution",
        "tick_resolution",
        "right_bar_stays_on_scroll",
        "hide_left_toolbar_by_default",
      ],
      charts_storage_url: props.charts_storage_url,
      charts_storage_api_version: props.charts_storage_api_version,
      client_id: props.client_id,
      user_id: props.user_id,
      fullscreen: props.fullscreen,
      autosize: props.autosize,
      loading_screen: { backgroundColor: "#131722" },
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
      if (updateThrottleRef.current) {
        clearTimeout(updateThrottleRef.current);
      }

      activeSubscriptions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (err) {
          console.error("Error cleaning up subscription:", err);
        }
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
*/

import styles from "./index.module.css";
import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { datafeedConfig } from "@/lib/datafeed";

export const TVChartContainer = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: props.symbol,
      // BEWARE: no trailing slash is expected in feed URL
      datafeed: datafeedConfig as any,
      interval: props.interval as ResolutionString,
      container: chartContainerRef.current,
      library_path: props.library_path,
      locale: props.locale as LanguageCode,
      disabled_features: ["use_localstorage_for_settings"],
      enabled_features: ["study_templates"],
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
            body: "Crashout Engineering",
            callback: () => {
              console.log("Noticed!");
            },
          })
        );

        button.innerHTML = "Check API";
      });
    });

    return () => {
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
