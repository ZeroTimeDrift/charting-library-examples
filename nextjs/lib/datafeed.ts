import { Codex } from "@codex-data/sdk";
import axios, { AxiosError } from "axios";
import {
  Bar,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from "@/public/static/charting_library/charting_library";
import { CODEX_API_KEY, CONFIGURATION_DATA, SOLANA_NETWORK_ID } from "./consts";
import { createSubscription, unsubscribeFromStream } from "./stream";
import { QuoteToken } from "@codex-data/sdk/dist/resources/graphql";

export const datafeedConfig = {
  onReady: (callback: any) => {
    console.log("[onReady]: Method call");
    setTimeout(() => callback(CONFIGURATION_DATA));
  },
  searchSymbols: async (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: any[]) => void
  ) => {
    console.log("[searchSymbols]: Method call");
    try {
      const symbols = await getAllSymbols();
      console.log("[searchSymbols]: Symbols", symbols);
      const matchingSymbols = symbols.filter((symbol) => {
        const symbolName = symbol.full_name.toLowerCase();
        const searchString = userInput.toLowerCase();
        return symbolName.indexOf(searchString) !== -1;
      });
      onResultReadyCallback(matchingSymbols);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("[searchSymbols]: Error getting symbols:", err.message);
      } else {
        console.error("[searchSymbols]: Unknown error occurred");
      }
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
        toSymbol: "USDC",
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

      onSymbolResolvedCallback(symbolInfo);
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
      const address = await getAddressFromTicker(symbol);

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
  subscribeBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onRealtimeCallback: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ) => {
    console.log(
      "[subscribeBars]: Method call with subscriberUID:",
      subscriberUID
    );
    createSubscription(
      symbolInfo,
      resolution as ResolutionString,
      onRealtimeCallback as SubscribeBarsCallback,
      subscriberUID
    );
  },
  unsubscribeBars: (subscriberUID: string) => {
    console.log(
      "[unsubscribeBars]: Method call with subscriberUID:",
      subscriberUID
    );
    unsubscribeFromStream(subscriberUID);
  },
};

// TODO: Remove this once we have a real implementation
export function getAddressFromTicker(ticker: string) {
  return "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
}

export async function fetchBars(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
  codex?: Codex
) {
  let client = codex || new Codex(CODEX_API_KEY);

  const response = await client.queries.getBars({
    symbol: symbol,
    resolution: resolution,
    from: from,
    to: to,
    removeEmptyBars: true,
    removeLeadingNullValues: true,
    countback: 100,
    quoteToken: QuoteToken.Token0,
  });

  console.log("[fetchBars]: Response", response);

  return response.getBars;
}

export async function getPairs(
  tokenAddress: string = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"
) {
  try {
    const response = await axios.post(
      "https://graph.codex.io/graphql",
      {
        query: `{
                    tokens(ids: {address: "${tokenAddress}" networkId: ${SOLANA_NETWORK_ID}}) {
                        address
                        id
                        name
                        networkId
                        symbol
                        exchanges {
                            address
                            color
                            exchangeVersion
                            iconUrl
                            id
                            name
                            networkId
                            tradeUrl
                        }
                        decimals
                        creatorAddress
                    }
                }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: CODEX_API_KEY,
        },
      }
    );
    console.log("[getPairs]: Response", response.data);
    return response.data.data.tokens[0];
  } catch (error) {
    throw new Error(`Codex API request error: ${error}`);
  }
}

export async function getAllSymbols() {
  let allSymbols: any[] = [];

  try {
    const response = await axios.post(
      "https://graph.codex.io/graphql",
      {
        query: `{
                    filterTokens(input: {
                        networkId: ${SOLANA_NETWORK_ID}
                        limit: 100
                        offset: 0
                    }) {
                        tokens {
                            name
                            symbol
                            address
                            networkId
                        }
                    }
                }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: CODEX_API_KEY,
        },
      }
    );

    const tokens = response.data.data.filterTokens.tokens;
    allSymbols = tokens.map((token: any) => ({
      symbol: token.symbol,
      full_name: `${token.symbol}/USDC`,
      description: token.name,
      exchange: "Solana",
      type: "crypto",
    }));

    return allSymbols;
  } catch (error) {
    throw new Error(`Error getting symbols: ${error}`);
  }
}

export function generateSymbol(
  exchange: string,
  fromSymbol: string,
  toSymbol: string
) {
  const short = `${fromSymbol}/${toSymbol}`;
  const full = `${exchange}:${fromSymbol}/${toSymbol}`;
  return {
    short,
    full,
  };
}

export function parseFullSymbol(fullSymbol: string) {
  const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
  if (!match) {
    return null;
  }
  return {
    exchange: match[1],
    fromSymbol: match[2],
    toSymbol: match[3],
  };
}
