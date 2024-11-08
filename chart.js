async function createChart() {
    try {
        const [response, divergencesResponse] = await Promise.all([
            fetch('btc_usdt_perp_1h_data.csv'),
            fetch('divergences.json')
        ]);

        const [csvText, divergences] = await Promise.all([
            response.text(),
            divergencesResponse.json()
        ]);

        const rows = csvText.split('\n');
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            return {
                time: new Date(values[0]).getTime() / 1000,
                open: parseFloat(values[1]),
                high: parseFloat(values[2]),
                low: parseFloat(values[3]),
                close: parseFloat(values[4]),
                volume: parseFloat(values[5]),
                rsi: values[6] ? parseFloat(values[6]) : null
            };
        });

        // Create main chart
        const chartContainer = document.getElementById('chart');
        const mainChart = LightweightCharts.createChart(chartContainer, {
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: '#d1d4dc',
            },
            timeScale: {
                borderColor: '#d1d4dc',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Create RSI chart
        const rsiContainer = document.getElementById('rsi');
        const rsiChart = LightweightCharts.createChart(rsiContainer, {
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            rightPriceScale: {
                borderColor: '#d1d4dc',
            },
            timeScale: {
                borderColor: '#d1d4dc',
                timeVisible: true,
                secondsVisible: false,
                visible: true,
            },
        });

        // Add candlestick series
        const candlestickSeries = mainChart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Add RSI series
        const rsiSeries = rsiChart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
            },
            title: 'RSI',
        });

        // Add RSI levels
        const rsiUpperLevel = rsiChart.addLineSeries({
            color: '#787B86',
            lineWidth: 1,
            lineStyle: 2,
        });

        const rsiLowerLevel = rsiChart.addLineSeries({
            color: '#787B86',
            lineWidth: 1,
            lineStyle: 2,
        });

        // Set data
        candlestickSeries.setData(data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        })));

        const rsiData = data.map(d => ({
            time: d.time,
            value: d.rsi,
        })).filter(d => d.value !== null);

        rsiSeries.setData(rsiData);
        rsiUpperLevel.setData(rsiData.map(d => ({ time: d.time, value: 70 })));
        rsiLowerLevel.setData(rsiData.map(d => ({ time: d.time, value: 30 })));

        // Add divergence areas and markers
        if (divergences?.bullishDivergences) {
            // Add markers
            candlestickSeries.setMarkers(
                divergences.bullishDivergences.map(div => ({
                    time: div.endTime,
                    position: 'belowBar',
                    color: '#2196F3',
                    shape: 'arrowUp',
                    text: `Bullish Div (${div.confidence.toFixed(2)})`
                }))
            );

            // Add price lines for each divergence
            divergences.bullishDivergences.forEach(div => {
                // Add price line connecting the lows
                candlestickSeries.createPriceLine({
                    price: div.startPrice,
                    color: '#2196F3',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    axisLabelVisible: true,
                    title: 'Bullish Div',
                    time: div.startTime,
                });
                candlestickSeries.createPriceLine({
                    price: div.endPrice,
                    color: '#2196F3',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    axisLabelVisible: true,
                    time: div.endTime,
                });

                // Add RSI lines
                rsiSeries.createPriceLine({
                    price: div.startRsi,
                    color: '#2196F3',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    axisLabelVisible: true,
                    time: div.startTime,
                });
                rsiSeries.createPriceLine({
                    price: div.endRsi,
                    color: '#2196F3',
                    lineWidth: 2,
                    lineStyle: LightweightCharts.LineStyle.Dotted,
                    axisLabelVisible: true,
                    time: div.endTime,
                });
            });
        }

        // Sync the charts
        let syncHandler = null;
        
        mainChart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
            if (syncHandler) return;
            
            syncHandler = setTimeout(() => {
                rsiChart.timeScale().setVisibleLogicalRange(logicalRange);
                syncHandler = null;
            }, 10);
        });

        rsiChart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
            if (syncHandler) return;
            
            syncHandler = setTimeout(() => {
                mainChart.timeScale().setVisibleLogicalRange(logicalRange);
                syncHandler = null;
            }, 10);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            mainChart.applyOptions({
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight
            });
            rsiChart.applyOptions({
                width: rsiContainer.clientWidth,
                height: rsiContainer.clientHeight
            });
        });

        // Initial content fit
        mainChart.timeScale().fitContent();
        rsiChart.timeScale().fitContent();

        // Force initial sync
        const mainRange = mainChart.timeScale().getVisibleLogicalRange();
        rsiChart.timeScale().setVisibleLogicalRange(mainRange);

    } catch (error) {
        console.error('Error creating chart:', error);
    }
}

document.addEventListener('DOMContentLoaded', createChart); 