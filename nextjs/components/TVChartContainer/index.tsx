import styles from "./index.module.css";
import { useEffect, useRef, useState } from "react";
import { ChartingLibraryWidgetOptions, LanguageCode, ResolutionString, widget, IDatafeedChartApi, LibrarySymbolInfo, PeriodParams, HistoryCallback, DatafeedErrorCallback, Bar } from "@/public/static/charting_library";
import { ExecutionResult, Sink } from "graphql-ws";

import { Codex } from "@codex-data/sdk";
import { OnBarsUpdatedResponse, Price, QuoteToken } from '@codex-data/sdk/dist/resources/graphql';


export const TVChartContainer = (props: Partial<ChartingLibraryWidgetOptions>) => {
	const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";
	// const pairId = "3a1Lqdpc6PiSbPMB6iZGt5sVNowuyQmJvwjzGdTyTode:1399811149"
	const activeSubscriptions = useRef(new Map());

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

	/* 	const sink2: Sink<ExecutionResult<any>> = {
			next: ({ data }) => {
				// Note that data is correctly typed as a Price model
				console.log("Got subscription data", data);
				console.log(data.onBarsUpdated.aggregates.r1.token);
				const token = data.onBarsUpdated.aggregates.r1.token;
				const bar: Bar =
				{
					time: Number(token.t) * 1000,
					open: Number(token.o),
					high: Number(token.h),
					low: Number(token.l),
					close: Number(token.c),
					volume: token.v ? Number(token.v) : undefined
				}
			},
			error: (err) => {
				console.log("Got subscription error", err);
			},
			complete: () => {
				console.log("Got subscription complete");
			},
		}; */

	const subscriptionCallbacks = useRef(new Map());

	const sink2: Sink<ExecutionResult<any>> = {
		next: ({ data }) => {
			console.log("sink2")

			if (!data?.onBarsUpdated?.aggregates?.r1?.token) return;

			const token = data.onBarsUpdated.aggregates.r1.token;
			console.log(token.t)
			const bar: Bar = {
				time: Number(token.t) * 1000,
				open: Number(token.o),
				high: Number(token.h),
				low: Number(token.l),
				close: Number(token.c),
				volume: token.v ? Number(token.v) : undefined
			};

			// Call all active callbacks with the new bar
			subscriptionCallbacks.current.forEach((callback) => {
				callback(bar);
			});
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

	/* 	useEffect(() => {
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
	
		}, []); */
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
			enabled_features: ["seconds_resolution", "tick_resolution"],
			symbol: props.symbol,
			// BEWARE: no trailing slash is expected in feed URL
			datafeed: {
				onReady: (callback) => {
					setTimeout(() => callback({ supported_resolutions: ["1S", "5S", "1", "5", "15", "30", "60", "240", "D", "W"].map(res => res as ResolutionString) }), 0);
				},
				searchSymbols: (userInput, exchange, symbolType, onResult) => {
					onResult([]);
				},
				resolveSymbol: (symbolName, onResolve, onError) => {
					setTimeout(() => {
						onResolve({
							name: symbolName,
							ticker: symbolName,
							type: "crypto",
							session: "24x7",
							timezone: "Etc/UTC",
							exchange: "",
							minmov: 1,
							// has_ticks: true,
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
							format: "price"
						});
					}, 0);
				},
				getBars: (symbolInfo, resolution, periodParams, onResult, onError) => {

					sdk.queries
						.getBars({
							symbol: "0x16b9a82891338f9ba80e2d6970fdda79d1eb0dae:56",
							from: twoHoursAgo,
							to: currentTime,
							resolution: "1S",
						})

						.then((res) => {
							const response = res.getBars;
							console.log("getBars called");
							console.log(response);
							const transformToTradingViewBars = (data: any): Bar[] => {
								if (!data || !Array.isArray(data.t)) {
									return [];
								}

								// Get the length of the time array to know how many bars we need to create
								const numberOfBars = data.t.length;
								const bars: Bar[] = [];

								// Iterate through the arrays and create bar objects
								for (let i = 0; i < numberOfBars; i++) {
									bars.push({
										time: data.t[i] * 1000, // Convert to milliseconds if needed
										open: Number(data.o[i]),
										high: Number(data.h[i]),
										low: Number(data.l[i]),
										close: Number(data.c[i]),
										volume: data.v ? Number(data.v[i]) : undefined
									});
								}

								return bars;
							};
							const bars = transformToTradingViewBars(response);

							onResult(bars, { noData: bars.length === 0 });

							/* onResult(res.getBars, { noData: res.bars.length === 0 }); */
						})
						.catch((err) => {
							onError(err);
						});
				},
				subscribeBars: (
					symbolInfo,
					resolution,
					onTick,
					subscriberUID,
					onResetCacheNeededCallback
				) => {
					console.log('Subscribing to bars:', subscriberUID);

					// Store the callback for this subscription
					subscriptionCallbacks.current.set(subscriberUID, onTick);

					// Create subscription
					const subscription = sdk.subscribe<any, { pairId: string }>(
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

					// Store the subscription for cleanup
					activeSubscriptions.current.set(subscriberUID, subscription);
				},
				unsubscribeBars: (subscriberUID) => {
					// Implement unsubscription logic here
				},
			},
			interval: props.interval as ResolutionString,

			container: chartContainerRef.current,
			library_path: props.library_path,
			locale: props.locale as LanguageCode,
			disabled_features: ["use_localstorage_for_settings"],
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
