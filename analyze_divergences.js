const fs = require('fs');

function findLocalExtrema(data, windowSize = 10) {
    const lows = [];
    const highs = [];

    for (let i = windowSize; i < data.length - windowSize; i++) {
        // Check if this point is a local minimum for price
        const leftPrices = data.slice(i - windowSize, i).map(d => d.low);
        const rightPrices = data.slice(i + 1, i + windowSize + 1).map(d => d.low);
        const currentPrice = data[i].low;

        if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
            lows.push({
                index: i,
                price: currentPrice,
                rsi: data[i].rsi
            });
        }
    }

    return { lows };
}

function findDivergences(data) {
    const { lows } = findLocalExtrema(data);
    const divergences = [];
    const maxLookback = 20; // Maximum candles to look back for divergence

    // Look for bullish divergences (lower lows in price, higher lows in RSI)
    for (let i = 1; i < lows.length; i++) {
        const current = lows[i];
        const previous = lows[i - 1];

        // Check if points are within maxLookback candles
        if (current.index - previous.index > maxLookback) continue;

        // Check for bullish divergence
        if (current.price < previous.price && current.rsi > previous.rsi) {
            // Calculate percentage price difference
            const priceDiff = (previous.price - current.price) / previous.price * 100;
            const rsiDiff = current.rsi - previous.rsi;

            // Only include significant divergences
            if (priceDiff > 1 && rsiDiff > 2) {
                // Calculate confidence based on RSI level and differences
                let confidence = 0.5;
                
                // Higher confidence if RSI is in oversold territory
                if (current.rsi < 35) confidence += 0.3;
                
                // Adjust confidence based on strength of divergence
                if (rsiDiff > 5) confidence += 0.1;
                if (priceDiff > 5) confidence += 0.1;

                divergences.push({
                    startIndex: previous.index,
                    endIndex: current.index,
                    priceStart: previous.price,
                    priceEnd: current.price,
                    rsiStart: previous.rsi,
                    rsiEnd: current.rsi,
                    confidence: Math.min(confidence, 1.0)
                });
            }
        }
    }

    return { divergences };
}

async function analyzeDivergences() {
    // Read the CSV file
    const csvData = fs.readFileSync('btc_usdt_perp_4h_data.csv', 'utf-8');
    const rows = csvData.split('\n');
    
    // Parse CSV data
    const data = rows.slice(1).map(row => {
        const values = row.split(',');
        return {
            timestamp: values[0],
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            rsi: parseFloat(values[6])
        };
    });

    // Find divergences
    const result = findDivergences(data);

    // Save divergences to file
    fs.writeFileSync('divergences.json', JSON.stringify(result, null, 2));
    console.log(`Analysis complete. Found ${result.divergences.length} bullish divergences.`);
}

analyzeDivergences();