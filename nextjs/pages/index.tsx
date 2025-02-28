import Head from "next/head";
import dynamic from "next/dynamic";
import { useState } from "react";
import Script from "next/script";

import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@/public/static/charting_library/charting_library";

const defaultWidgetProps: Partial<ChartingLibraryWidgetOptions> = {
  symbol: "WIF",
  interval: "1S" as ResolutionString,
  library_path: "/static/charting_library/",
  locale: "en",
  charts_storage_url: "https://saveload.tradingview.com",
  charts_storage_api_version: "1.1",
  client_id: "tradingview.com",
  user_id: "public_user_id",
  fullscreen: false,
  autosize: true,
  enabled_features: ["seconds_resolution", "tick_resolution"],
  time_scale: {
    min_bar_spacing: 1,


  },
  theme: "dark",
};

/*
{
  "color1":["#ffeaff","#fed5ff","#febfff","#feaaff","#fd95ff","#fd80ff","#fd6aff","#fc55ff","#fc40ff","#fc2bff","#fb00ff","#e600ea","#d100d5","#bc00bf","#a700aa","#920095","#7e0080","#69006a","#540055","#3f0040"],
  "color2":["#f4f4f5","#e9e9eb","#dddee1","#d2d3d7","#c7c8cd","#bcbdc3","#b0b2b8","#a5a7ae","#9a9ca4","#8f919a","#787b86","#6e717b","#646770","#5a5c65","#505259","#46484e","#3c3e43","#323338","#28292d","#1e1f22"],
  "color3":["#ffeaec","#ffd5d8","#ffbfc5","#ffaab1","#ff959e","#ff808a","#ff6a77","#ff5563","#ff4050","#ff2b3c","#ff0015","#ea0013","#d50012","#bf0010","#aa000e","#95000c","#80000b","#6a0009","#550007","#400005"],
  "color4":["#ebfbf8","#d6f7f1","#c2f3ea","#adeee3","#99eadc","#85e6d6","#70e2cf","#5cdec8","#47dac1","#33d5ba","#0acdac","#09bc9e","#08ab8f","#089a81","#078973","#067864","#056756","#045548","#034439","#03332b"],
  "color5":["#eaf2ff","#d5e5ff","#bfd8ff","#aacbff","#95beff","#80b1ff","#6aa3ff","#5596ff","#4089ff","#2b7cff","#0062ff","#005aea","#0052d5","#004abf","#0041aa","#003995","#003180","#00296a","#002155","#001940"],
  "color6":["#f8eaff","#f0d5ff","#e9bfff","#e1aaff","#da95ff","#d380ff","#cb6aff","#c455ff","#bc40ff","#b52bff","#a600ff","#9800ea","#8a00d5","#7d00bf","#6f00aa","#610095","#530080","#45006a","#370055","#2a0040"],
  "color7":["#fff5ea","#ffebd5","#ffe1bf","#ffd7aa","#ffcd95","#ffc480","#ffba6a","#ffb055","#ffa640","#ff9c2b","#ff8800","#ea7d00","#d57100","#bf6600","#aa5b00","#954f00","#804400","#6a3900","#552d00","#402200"],
  "white":"#000000",
  "black":"#ffffff"
}
*/

const TVChartContainer = dynamic(
  () =>
    import("@/components/TVChartContainer").then((mod) => mod.TVChartContainer),
  { ssr: false }
);

export default function Home() {
  const [isScriptReady, setIsScriptReady] = useState(false);
  return (
    <>
      <Head>
        <title>TradingView Charting Library and Next.js</title>
      </Head>
      <Script
        src="/static/datafeeds/udf/dist/bundle.js"
        strategy="lazyOnload"
        onReady={() => {
          setIsScriptReady(true);
        }}
      />
      {isScriptReady && <TVChartContainer {...defaultWidgetProps} />}
    </>
  );
}
