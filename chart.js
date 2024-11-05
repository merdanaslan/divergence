async function createChart() {
    // Load both CSV and divergences data
    const [response, divergencesResponse] = await Promise.all([
        fetch('btc_usdt_perp_4h_data.csv'),
        fetch('divergences.json')
    ]);
    
    const [csvText, divergences] = await Promise.all([
        response.text(),
        divergencesResponse.json()
    ]);

    // Load the CSV data
    const rows = csvText.split('\n');
    const headers = rows[0].split(',');
    
    // Parse CSV data
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
        },
    });

    // Create candlestick series
    const candlestickSeries = mainChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

    // Add volume series
    const volumeSeries = mainChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
            top: 0.8,
            bottom: 0,
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
            borderVisible: false,
        },
    });

    // Add RSI series
    const rsiSeries = rsiChart.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        priceFormat: {
            type: 'price',
            precision: 2,
        },
    });

    // Add overbought/oversold lines
    const overboughtLine = rsiChart.addLineSeries({
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: 2,
    });

    const oversoldLine = rsiChart.addLineSeries({
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: 2,
    });

    // Prepare data for each series
    const candleData = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
    }));

    const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#26a69a80' : '#ef535080',
    }));

    const rsiData = data.map(d => ({
        time: d.time,
        value: d.rsi,
    })).filter(d => d.value !== null);

    // Set the data
    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);
    rsiSeries.setData(rsiData);

    // Add overbought (70) and oversold (30) lines
    const overboughtData = data.map(d => ({
        time: d.time,
        value: 70,
    }));

    const oversoldData = data.map(d => ({
        time: d.time,
        value: 30,
    }));

    overboughtLine.setData(overboughtData);
    oversoldLine.setData(oversoldData);

    // Sync the charts' time scales
    mainChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
        rsiChart.timeScale().setVisibleRange(timeRange);
    });

    // Fit the content
    mainChart.timeScale().fitContent();
    rsiChart.timeScale().fitContent();

    // Add divergence markers
    const markers = [];
    divergences.divergences.forEach(div => {
        const startData = data[div.startIndex];
        const endData = data[div.endIndex];
        
        // Add marker for divergence
        markers.push({
            time: endData.time,
            position: 'belowBar',
            color: '#2196F3',
            shape: 'arrowUp',
            text: `Bullish Div (${div.confidence.toFixed(2)})`
        });

        // Add divergence line on price
        candlestickSeries.createPriceLine({
            price: 0,
            color: '#2196F3',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: false,
            title: '',
            time: startData.time,
            endTime: endData.time
        });

        // Add divergence line on RSI
        rsiSeries.createPriceLine({
            price: 0,
            color: '#2196F3',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            axisLabelVisible: false,
            title: '',
            time: startData.time,
            endTime: endData.time
        });
    });

    candlestickSeries.setMarkers(markers);
}

// Initialize the chart when the page loads
document.addEventListener('DOMContentLoaded', createChart); 