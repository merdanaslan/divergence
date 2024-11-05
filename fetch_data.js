const ccxt = require('ccxt');
const fs = require('fs');
const { RSI } = require('technicalindicators');

async function fetchOHLCVData() {
    // Initialize the Binance Futures exchange
    const exchange = new ccxt.binanceusdm({
        enableRateLimit: true,
    });

    try {
        // Define parameters
        const symbol = 'BTC/USDT';
        const timeframe = '4h';
        const startDate = new Date('2024-02-26').getTime();
        const endDate = new Date('2024-11-04').getTime();
        
        console.log('Fetching data...');
        
        let allCandles = [];
        let since = startDate;
        
        // Fetch all candles in a loop
        while (since < endDate) {
            const candles = await exchange.fetchOHLCV(
                symbol,
                timeframe,
                since,
                1000,
                { endTime: endDate }
            );
            
            if (candles.length === 0) {
                break;
            }
            
            allCandles = allCandles.concat(candles);
            since = candles[candles.length - 1][0] + 1;
            
            console.log(`Fetched ${allCandles.length} candles so far...`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Process the data
        const processedData = allCandles.map(candle => ({
            timestamp: new Date(candle[0]).toISOString(),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5]
        }));
        
        // Calculate RSI using technicalindicators library
        const closes = processedData.map(d => d.close);
        const rsiInput = {
            values: closes,
            period: 14
        };
        const rsiValues = RSI.calculate(rsiInput);
        
        // Add RSI to processed data
        const rsiOffset = processedData.length - rsiValues.length;
        processedData.forEach((data, index) => {
            const rsiIndex = index - rsiOffset;
            data.rsi = rsiIndex >= 0 ? rsiValues[rsiIndex].toFixed(2) : '';
        });
        
        // Save to file without divergence analysis
        const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'rsi'];
        const csvContent = [
            headers.join(','),
            ...processedData.map(row => 
                headers.map(header => row[header]).join(',')
            )
        ].join('\n');
        
        fs.writeFileSync('btc_usdt_perp_4h_data.csv', csvContent);
        console.log(`\nData saved to btc_usdt_perp_4h_data.csv`);
        console.log(`Total candles fetched: ${processedData.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the function
fetchOHLCVData();