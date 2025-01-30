import styles from "./index.module.css";
import { useEffect, useRef, useState } from "react";
import { ChartingLibraryWidgetOptions, LanguageCode, ResolutionString, widget, IDatafeedChartApi } from "@/public/static/charting_library";
import { ExecutionResult, Sink } from "graphql-ws";

import { Codex } from "@codex-data/sdk";
import { OnBarsUpdatedResponse, Price, QuoteToken } from '@codex-data/sdk/dist/resources/graphql';


export const TVChartContainer = (props: Partial<ChartingLibraryWidgetOptions>) => {
	const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";
	// const pairId = "3a1Lqdpc6PiSbPMB6iZGt5sVNowuyQmJvwjzGdTyTode:1399811149"

	const [chartData, setChartData] = useState<any | null>(null);
	const sdk = new Codex(DEFINED_API_KEY);

	/*     sdk.queries
			.listPairsForToken({
				networkId: 1399811149,
				tokenAddress: "7mWC6SRMGWVAaUqV6oXd1PRz8SW3WGY82JjVzM4vpump",
				limit: 1,
			})
			.then((res) => {
	
				console.log("token: " + res.listPairsForToken[0].address);
				setPairId(res.listPairsForToken[0].address + ":1399811149");
	
			}); */
	const sink: Sink<ExecutionResult<Price>> = {
		next: ({ data }) => {
			// Note that data is correctly typed as a Price model
			console.log("Got subscription data", data);
		},
		error: (err) => {
			console.log("Got subscription error", err);
		},
		complete: () => {
			console.log("Got subscription complete");
		},
	};

	const sink2: Sink<ExecutionResult<any>> = {
		next: ({ data }) => {
			// Note that data is correctly typed as a Price model
			console.log("Got subscription data", data);
		},
		error: (err) => {
			console.log("Got subscription error", err);
		},
		complete: () => {
			console.log("Got subscription complete");
		},
	};
	const currentTime = Math.floor(Date.now() / 1000);
	const twoHoursAgo = currentTime - (1499); // subtract 2 hours worth of seconds

	useEffect(() => {
		sdk.queries
			.getBars({
				symbol: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae:56",
				from: twoHoursAgo,
				to: currentTime,
				resolution: "1S",
			})
			.then((res) => {

				console.log(res);
				setChartData(res);

			})
			.catch((err) => {
				console.log(err);
			});

	}, []);
	/* const address =
		process.argv[2] ?? "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv";
	const networkId = process.argv[3] ?? "1399811149";
	
	console.log(`subscribing to ${address}:${networkId}`); */

	// Subscribes to the onPriceUpdated event and just logs out the value to the console
	useEffect(() => {
		/* const subscribe = sdk.subscribe<Price, { address: string; networkId: number }>(
			`
		  subscription onPriceUpdated($address: String!, $networkId: Int!) {
			onPriceUpdated(address: $address, networkId: $networkId) {
			  address
			  networkId
			  priceUsd
			  timestamp
			}
		  }
		`,
			{
				address,
				networkId: parseInt(networkId),
			},
			sink,
		); */

		const subscribe2 = sdk.subscribe<ResponseType, { pairId: string }>(
			`subscription OnBarsUpdated($pairId: String) {
                onBarsUpdated(pairId: $pairId) {
                 eventSortKey
    networkId
    pairAddress
    pairId
    timestamp
    quoteToken
    aggregates {
      r1 { t usd { t o h l c volume } token { t o h l c volume } }
      r5 { t usd { t o h l c volume } token { t o h l c volume } }
      r15 { t usd { t o h l c volume } token { t o h l c volume } }
      r30 { t usd { t o h l c volume } token { t o h l c volume } }
      r60 { t usd { t o h l c volume } token { t o h l c volume } }
      r240 { t usd { t o h l c volume } token { t o h l c volume } }
      r720 { t usd { t o h l c volume } token { t o h l c volume } }
      r1D { t usd { t o h l c volume } token { t o h l c volume } }
      r7D { t usd { t o h l c volume } token { t o h l c volume } }
    }
                }
            }`,
			{
				pairId: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae:56",
			},
			sink2
		);
	}, []);
	const chartContainerRef =
		useRef<HTMLDivElement>() as React.MutableRefObject<HTMLInputElement>;

	useEffect(() => {
		const widgetOptions: ChartingLibraryWidgetOptions = {
			symbol: props.symbol,
			// BEWARE: no trailing slash is expected in feed URL
			datafeed: new (window as any).Datafeeds.UDFCompatibleDatafeed(
				"https://demo_feed.tradingview.com",
				undefined,
				{
					maxResponseLength: 1000,
					expectedOrder: "latestFirst",
				}
			),
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
			autosize: props.autosize
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
			tvWidget.remove();
		};
	}, [props]);

	return (
		<>
			<header className={styles.VersionHeader}>
				<h1>
					TradingView Charting Library and Next.js Integration Example
				</h1>
			</header>
			<div ref={chartContainerRef} className={styles.TVChartContainer} />
		</>
	);
};
