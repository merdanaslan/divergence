const ccxt = require('ccxt');
const fs = require('fs');
const { RSI } = require('technicalindicators');

async function fetchOHLCVData() {
    const exchange = new ccxt.binanceusdm({
        enableRateLimit: true,
    });

    try {
        // Define parameters
        const symbol = 'BTC/USDT';
        const timeframe = '1h';
        const startDate = new Date('2024-11-06').getTime();
        const endDate = new Date('2024-11-07T12:00:00').getTime();
        
        // Calculate start time for RSI (14 candles before actual start)
        const rsiStartDate = startDate - (14 * 60 * 60 * 1000);
        
        console.log('Fetching data...');
        
        let allCandles = [];
        let since = rsiStartDate;
        
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
        
        console.log('Calculating RSI...');
        
        // Calculate RSI using all candles
        const allCloses = allCandles.map(candle => candle[4]);
        const rsiInput = {
            values: allCloses,
            period: 14
        };
        const allRsiValues = RSI.calculate(rsiInput);
        
        // Create a map of timestamp to RSI value
        const rsiMap = new Map();
        allCandles.forEach((candle, index) => {
            if (index >= 14) { // RSI values start after the first 14 candles
                rsiMap.set(candle[0], allRsiValues[index - 14]);
            }
        });
        
        // Process only the data within our target timeframe
        const processedData = allCandles
            .filter(candle => candle[0] >= startDate && candle[0] <= endDate)
            .map(candle => ({
                timestamp: new Date(candle[0]).toISOString(),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4],
                volume: candle[5],
                rsi: rsiMap.get(candle[0]).toFixed(2)
            }));
        
        // Save to file
        const headers = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'rsi'];
        const csvContent = [
            headers.join(','),
            ...processedData.map(row => 
                headers.map(header => row[header]).join(',')
            )
        ].join('\n');
        
        fs.writeFileSync('btc_usdt_perp_1h_data.csv', csvContent);
        console.log(`\nData saved to btc_usdt_perp_1h_data.csv`);
        console.log(`Total candles in specified timeframe: ${processedData.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the function
fetchOHLCVData();