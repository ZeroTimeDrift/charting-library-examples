import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ChartingLibraryWidgetOptions,
  ResolutionString,
} from "@/public/static/charting_library/charting_library";
import { Coins, Globe, Star } from "lucide-react";
import { useRouter } from "next/router";

const TVChartContainer = dynamic(
  () =>
    import("@/components/TVChartContainer").then((mod) => mod.TVChartContainer),
  { ssr: false }
);

const DUMMY_TABLE_DATA = [
  {
    action: "Buy",
    age: "2 mins ago",
    price: "$1.23",
    sol: "0.05",
    address: "7xKX...dF9K",
  },
  {
    action: "Sell",
    age: "5 mins ago",
    price: "$1.21",
    sol: "0.03",
    address: "9aBC...eR4M",
  },
  {
    action: "Buy",
    age: "10 mins ago",
    price: "$1.20",
    sol: "0.08",
    address: "3mNP...hJ2L",
  },
  {
    action: "Buy",
    age: "10 mins ago",
    price: "$1.20",
    sol: "0.08",
    address: "3mNP...hJ2L",
  },
  {
    action: "Buy",
    age: "10 mins ago",
    price: "$1.20",
    sol: "0.08",
    address: "3mNP...hJ2L",
  },
  {
    action: "Buy",
    age: "10 mins ago",
    price: "$1.20",
    sol: "0.08",
    address: "3mNP...hJ2L",
  },
];

export const TOKENS = [
  {
    title: "ai16z",
    symbol: "ai16z",
    address: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
    image: "/ai16z.png",
  },
  {
    title: "Fartcoin",
    symbol: "Fartcoin",
    address: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    image: "/fartcoin.png",
  },
  {
    title: "Vine",
    symbol: "VINE",
    address: "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump",
    image: "/vine.png",
  },
  {
    title: "DOGE AI",
    symbol: "DOGEAI",
    address: "9UYAYvVS2cZ3BndbsoG1ScJbjfwyEPGxjE79hh5ipump",
    image: "/dogeai.png",
  },
];

const SIDEBAR_LINKS = [
  {
    title: "Discover",
    description: "Find new assets",
    href: "/",
    icon: Globe,
  },
  {
    title: "Portfolio",
    description: "View your holdings",
    href: "/",
    icon: Coins,
  },
  {
    title: "Watchlist",
    description: "Assets you're watching",
    href: "/",
    icon: Star,
  },
];

export default function Home() {
  const { query, reload, push } = useRouter();
  const [isScriptReady, setIsScriptReady] = useState(false);

  const defaultWidgetProps: Partial<ChartingLibraryWidgetOptions> = {
    symbol:
      TOKENS.find((token) => token.address === query.token)?.symbol || "WIF",
    interval: "1" as ResolutionString,
    library_path: "/static/charting_library/",
    locale: "en",
    client_id: "tradingview.com",
    user_id: "public_user_id",
    autosize: true,
    theme: "dark",
    timeframe: "1H",
    time_frames: [
      {
        text: "12h",
        resolution: "1m" as ResolutionString,
        description: "12 hours",
        title: "12h",
      },
      {
        text: "1h",
        resolution: "1m" as ResolutionString,
        description: "1 hour",
        title: "1h",
      },
      {
        text: "5m",
        resolution: "1S" as ResolutionString,
        description: "5 minutes",
        title: "5m",
      },
      {
        text: "1m",
        resolution: "1S" as ResolutionString,
        description: "1 minute",
        title: "1m",
      },
    ],
    enabled_features: [
      "library_custom_color_themes",
      "header_chart_type",
      "header_resolutions",
      "header_settings",
      "seconds_resolution",
      "tick_resolution",
      "display_market_status",
    ],
    time_scale: {
      min_bar_spacing: 1,
    },
  };

  useEffect(() => {
    setIsScriptReady(true);
  }, []);

  return (
    <div className="flex h-screen bg-base">
      {/* Sidebar */}
      <div className="w-fit border-r border-muted-800/75 flex flex-col">
        <div className="p-3 pl-7 border-b border-muted-800/75">
          <Image
            src="/mg.svg"
            alt="Moongate"
            width={32}
            height={32}
            className="w-32"
          />
        </div>
        <div className="overflow-y-auto p-4">
          {SIDEBAR_LINKS.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="flex items-center p-3 mb-2 rounded-lg hover:bg-muted-700/20 transition-colors"
            >
              <div className="w-10 h-10 bg-muted-800/75 rounded-full flex items-center justify-center">
                <link.icon className="w-5 h-5 text-muted-700" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">{link.title}</h3>
                <p className="text-xs text-muted-500">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 border-t border-muted-800/75">
          {TOKENS.map((token, index) => (
            <div
              key={index}
              onClick={async () => {
                await push({
                  pathname: "/",
                  query: { token: token.address },
                });
                reload();
              }}
              className={`flex items-center p-3 mb-2 rounded-lg hover:bg-muted-700/20 transition-colors ${
                query.token === token.address ? "bg-muted-700/20" : ""
              }`}
            >
              <div className="flex items-center justify-center">
                {/* Placeholder for image */}
                <Image
                  src={token.image}
                  alt={token.title}
                  width={20}
                  height={20}
                  className="rounded-full w-10 h-10"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-white">
                  {token.title}
                </h3>
                <p className="text-xs text-muted-500">{token.symbol}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Chart */}
        <div className="border-b border-muted-800/75">
          {isScriptReady && (
            <TVChartContainer
              token={
                TOKENS.find((token) => token.address === query.token) ||
                TOKENS[0]
              }
              chartConfig={defaultWidgetProps}
            />
          )}
        </div>

        <div className="flex-1 overflow-auto border-b border-muted-800/75">
          <div className="relative">
            <table className="w-full">
              <thead className="bg-[#070812]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-500 uppercase tracking-wider">
                    SOL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-500 uppercase tracking-wider">
                    Age
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-auto max-h-[calc(100vh-500px)]">
            <table className="w-full">
              <tbody className="bg-[#090b18] divide-y divide-[#0f1127]">
                {DUMMY_TABLE_DATA.map((row, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          row.action === "Buy"
                            ? "bg-green-500/30 text-green-400"
                            : "bg-red-500/30 text-red-400"
                        }`}
                      >
                        {row.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-500 font-mono">
                      {row.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-500">
                      {row.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-500">
                      {row.sol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-500">
                      {row.age}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="h-7 px-6 flex items-center">{/* todo */}</footer>
      </div>
    </div>
  );
}
