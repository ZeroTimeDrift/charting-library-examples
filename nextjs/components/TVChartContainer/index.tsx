import styles from "./index.module.css";
import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  Timezone,
  widget,
} from "@/public/static/charting_library";
import { useDatafeed } from "@/lib/hooks/use-datafeed";
import { MOONGATE_NIGHT_COLORS } from "@/lib/consts";

export const TVChartContainer = ({
  token,
  chartConfig,
}: {
  token: {
    title: string;
    symbol: string;
    address: string;
    image: string;
  };
  chartConfig: Partial<ChartingLibraryWidgetOptions>;
}) => {
  const datafeed = useDatafeed();
  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    // @ts-ignore
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: chartConfig.symbol,
      datafeed: datafeed as any,
      interval: chartConfig.interval as ResolutionString,
      container: chartContainerRef.current,
      library_path: chartConfig.library_path,
      locale: chartConfig.locale as LanguageCode,
      disabled_features: [
        "header_undo_redo",
        "header_compare",
        "header_symbol_search",
        "use_localstorage_for_settings",
        "border_around_the_chart",
        "save_chart_properties_to_local_storage",
        "save_shortcut",
      ],
      enabled_features: chartConfig.enabled_features,
      charts_storage_url: chartConfig.charts_storage_url,
      charts_storage_api_version: chartConfig.charts_storage_api_version,
      client_id: chartConfig.client_id,
      user_id: chartConfig.user_id,
      fullscreen: chartConfig.fullscreen,
      autosize: chartConfig.autosize,
      time_scale: chartConfig.time_scale,
      timeframe: chartConfig.timeframe,
      toolbar_bg: "#05060d",
      custom_css_url: "/static/chart.css",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone as Timezone,
      header_widget_buttons_mode: "fullsize",
      custom_themes: {
        dark: MOONGATE_NIGHT_COLORS,
        light: MOONGATE_NIGHT_COLORS,
      },
      overrides: {
        // Chart background
        "paneProperties.background": "#05060d",
        "paneProperties.backgroundType": "solid",
        // Vertical grid lines on chart
        "paneProperties.vertGridProperties.color": "rgb(38, 38, 38, 0.5)",
        "paneProperties.horzGridProperties.color": "rgb(38, 38, 38, 0.5)",
        // Legend
        "paneProperties.legendProperties.showSeriesOHLC": true,
        "paneProperties.legendProperties.showSeriesVolume": true,
        // Header
        "mainSeriesProperties.statusViewStyle.showInterval": true,
      },
    };

    const tvWidget = new widget(widgetOptions);

    tvWidget.onChartReady(() => {
      tvWidget.headerReady().then(() => {
        const usdSol = tvWidget.createButton();
        usdSol.setAttribute("title", "Toggle USD/SOL");

        let isUsdActive = true;

        const updateCurrencyButtonState = () => {
          usdSol.innerHTML = isUsdActive
            ? `
            <div class="flex items-center gap-1">
              <span style="color: #a855f7 !important;">
                USD
              </span>
              <span>
                /
              </span>
              <span>
                SOL
              </span>
            </div>
          `
            : `
            <div class="flex items-center gap-1">
              <span>
                USD
              </span>
              <span>
                /
              </span>
              <span style="color: #a855f7 !important;">
                SOL
              </span>
            </div>
          `;
        };

        usdSol.addEventListener("click", (e) => {
          const clickedElement = e.target as HTMLElement;
          const text = clickedElement.textContent?.trim();

          if (text === "USD" && !isUsdActive) {
            isUsdActive = true;
            console.log("Switched to USD view");
          } else if (text === "SOL" && isUsdActive) {
            isUsdActive = false;
            console.log("Switched to SOL view");
          }

          updateCurrencyButtonState();
        });

        updateCurrencyButtonState();

        const priceMcap = tvWidget.createButton();
        priceMcap.setAttribute("title", "Toggle Price/MCap");

        let isPriceActive = true;

        const updatePriceMcapButtonState = () => {
          priceMcap.innerHTML = isPriceActive
            ? `
            <div class="flex items-center gap-1">
              <span style="color: #a855f7 !important;">
                Price
              </span>
              <span>
                /
              </span>
              <span>
                MCap
              </span>
            </div>
          `
            : `
            <div class="flex items-center gap-1">
              <span>
                Price
              </span>
              <span>
                /
              </span>
              <span style="color: #a855f7 !important;">
                MCap
              </span>
            </div>
          `;
        };

        priceMcap.addEventListener("click", (e) => {
          const clickedElement = e.target as HTMLElement;
          const text = clickedElement.textContent?.trim();

          if (text === "Price" && !isPriceActive) {
            isPriceActive = true;
            console.log("Switched to Price view");
          } else if (text === "MCap" && isPriceActive) {
            isPriceActive = false;
            console.log("Switched to MCap view");
          }

          updatePriceMcapButtonState();
        });

        // Initial render
        updatePriceMcapButtonState();

        const button = tvWidget.createButton();
        button.setAttribute("title", "Options");
        button.classList.add("apply-common-tooltip");
        button.addEventListener(
          "click",
          () => {}
          /*
          tvWidget.showNoticeDialog({
            title: "Notification",
            body: "Crashout Engineering",
            callback: () => {
              console.log("Noticed!");
            },
          })
            */
        );

        button.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-500">
              Options
            </span>
          </div>
        `;
      });
    });

    return () => {
      tvWidget.remove();
    };
  }, [chartConfig]);

  return (
    <>
      <div ref={chartContainerRef} className={styles.TVChartContainer} />
    </>
  );
};
