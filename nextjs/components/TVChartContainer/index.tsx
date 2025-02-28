import styles from "./index.module.css";
import { useEffect, useRef } from "react";
import {
  ChartingLibraryWidgetOptions,
  LanguageCode,
  ResolutionString,
  widget,
} from "@/public/static/charting_library";
import { useDatafeed } from "@/lib/hooks/use-datafeed";
import { MOONGATE_NIGHT_COLORS } from "@/lib/consts";

export const TVChartContainer = (
  props: Partial<ChartingLibraryWidgetOptions>
) => {
  const datafeed = useDatafeed();
  const chartContainerRef = useRef<HTMLDivElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    // @ts-ignore
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: props.symbol,

      // BEWARE: no trailing slash is expected in feed URL
      datafeed: datafeed as any,
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
      time_scale: props.time_scale,
      fullscreen: props.fullscreen,
      autosize: props.autosize,
      custom_themes: {
        dark: MOONGATE_NIGHT_COLORS,
        light: MOONGATE_NIGHT_COLORS,
      },
      overrides: {
        "paneProperties.separatorColor": "#ebfbf8",
        "paneProperties.background": "#000000",
        "paneProperties.backgroundType": "solid",
      },
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
      <div ref={chartContainerRef} className={styles.TVChartContainer} />
    </>
  );
};
