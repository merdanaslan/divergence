require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeDivergencesWithAI() {
    // Read the CSV file
    const csvData = fs.readFileSync('btc_usdt_perp_1h_data.csv', 'utf-8');
    const rows = csvData.split('\n');
    
    // Parse CSV data
    const data = rows.slice(1).map((row, index) => {
        const values = row.split(',');
        return {
            index,
            timestamp: values[0],
            time: new Date(values[0]).getTime() / 1000,
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            rsi: parseFloat(values[6])
        };
    });

    // Create prompt for GPT with more detailed divergence rules
    const prompt = `Analyze the following Bitcoin price and RSI data for divergences using these specific criteria:

    1. HIDDEN BULLISH DIVERGENCE (Check this pattern first):
       - Price Action: MUST make a HIGHER LOW (second low is higher than first low)
       - RSI Action: MUST make a LOWER LOW (second RSI is lower than first RSI)
       - Example: Price: 30000->31000 (higher), RSI: 35->30 (lower)
       - Validation:
         * Price difference should be at least 0.5%
         * RSI difference should be at least 2 points
         * Best when RSI is below 40
         * Maximum 20 candles between points

    2. REGULAR BULLISH DIVERGENCE:
       - Price Action: MUST make a LOWER LOW (second low is lower than first low)
       - RSI Action: MUST make a HIGHER LOW (second RSI is higher than first RSI)
       - Example: Price: 30000->29000 (lower), RSI: 30->35 (higher)
       - Validation:
         * Price difference should be at least 0.5%
         * RSI difference should be at least 2 points
         * Best when RSI is below 30
         * Maximum 20 candles between points

    3. REGULAR BEARISH DIVERGENCE:
       - Price Action: MUST make a HIGHER HIGH (second high is higher than first high)
       - RSI Action: MUST make a LOWER HIGH (second RSI is lower than first RSI)
       - Example: Price: 30000->31000 (higher), RSI: 70->65 (lower)
       - Validation:
         * Price difference should be at least 0.5%
         * RSI difference should be at least 2 points
         * Best when RSI is above 70
         * Maximum 20 candles between points

    4. HIDDEN BEARISH DIVERGENCE:
       - Price Action: MUST make a LOWER HIGH (second high is lower than first high)
       - RSI Action: MUST make a HIGHER HIGH (second RSI is higher than first RSI)
       - Example: Price: 30000->29500 (lower), RSI: 65->70 (higher)
       - Validation:
         * Price difference should be at least 0.5%
         * RSI difference should be at least 2 points
         * Best when RSI is above 60
         * Maximum 20 candles between points

    CONFIDENCE CALCULATION:
    Base confidence starts at 0.5 and is adjusted by:
    1. Price Movement (±0.15):
       - Larger price differences increase confidence
       - Minimum 0.5% difference required
       - Maximum bonus at 2% difference

    2. RSI Position (±0.15):
       For Bullish:
       - Below 30: +0.15
       - 30-40: +0.10
       - 40-50: +0.05
       For Bearish:
       - Above 70: +0.15
       - 60-70: +0.10
       - 50-60: +0.05

    3. Time Frame (±0.10):
       - Less than 10 candles: +0.10
       - 10-15 candles: +0.05
       - 15-20 candles: +0.00

    4. RSI Difference (±0.10):
       - >5 points: +0.10
       - 3-5 points: +0.05
       - 2-3 points: +0.02

    Only include divergences with final confidence > 0.65

    Return the results in this exact JSON format:
    {
        "bullishDivergences": [
            {
                "startIndex": number,
                "endIndex": number,
                "startPrice": number,
                "endPrice": number,
                "startRsi": number,
                "endRsi": number,
                "confidence": number,
                "type": "regular" | "hidden",
                "priceChange": number,
                "rsiChange": number,
                "timeframe": number
            }
        ],
        "bearishDivergences": [
            {
                "startIndex": number,
                "endIndex": number,
                "startPrice": number,
                "endPrice": number,
                "startRsi": number,
                "endRsi": number,
                "confidence": number,
                "type": "regular" | "hidden",
                "priceChange": number,
                "rsiChange": number,
                "timeframe": number
            }
        ]
    }

    Data:
    ${JSON.stringify(data)}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a technical analysis expert specializing in divergence detection. Focus on identifying both regular and hidden divergences accurately. Respond only with valid JSON matching the specified format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
        });

        const divergences = JSON.parse(completion.choices[0].message.content);
        
        // Add time information to divergences
        divergences.bullishDivergences = divergences.bullishDivergences.map(div => ({
            ...div,
            startTime: data[div.startIndex].time,
            endTime: data[div.endIndex].time,
            startDate: new Date(data[div.startIndex].timestamp).toLocaleString(),
            endDate: new Date(data[div.endIndex].timestamp).toLocaleString()
        }));

        divergences.bearishDivergences = divergences.bearishDivergences.map(div => ({
            ...div,
            startTime: data[div.startIndex].time,
            endTime: data[div.endIndex].time,
            startDate: new Date(data[div.startIndex].timestamp).toLocaleString(),
            endDate: new Date(data[div.endIndex].timestamp).toLocaleString()
        }));

        // Save divergences to a JSON file
        fs.writeFileSync('divergences.json', JSON.stringify(divergences, null, 2));

        // Log the results with detailed information
        console.log('\n=== Divergence Analysis Results ===\n');
        
        console.log(`Found ${divergences.bullishDivergences.length} bullish divergences:`);
        divergences.bullishDivergences.forEach((div, index) => {
            console.log(`\nBullish Divergence #${index + 1} (${div.type}):`);
            console.log(`Start: ${div.startDate}`);
            console.log(`End: ${div.endDate}`);
            console.log(`Price: ${div.startPrice} → ${div.endPrice}`);
            console.log(`RSI: ${div.startRsi.toFixed(2)} → ${div.endRsi.toFixed(2)}`);
            console.log(`Confidence: ${(div.confidence * 100).toFixed(1)}%`);
        });

        console.log('\n----------------------------------------');
        
        console.log(`\nFound ${divergences.bearishDivergences.length} bearish divergences:`);
        divergences.bearishDivergences.forEach((div, index) => {
            console.log(`\nBearish Divergence #${index + 1} (${div.type}):`);
            console.log(`Start: ${div.startDate}`);
            console.log(`End: ${div.endDate}`);
            console.log(`Price: ${div.startPrice} → ${div.endPrice}`);
            console.log(`RSI: ${div.startRsi.toFixed(2)} → ${div.endRsi.toFixed(2)}`);
            console.log(`Confidence: ${(div.confidence * 100).toFixed(1)}%`);
        });
        
    } catch (error) {
        console.error('Error analyzing divergences with AI:', error);
    }
}

analyzeDivergencesWithAI();