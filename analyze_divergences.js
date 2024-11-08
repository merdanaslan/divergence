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
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
            rsi: parseFloat(values[6])
        };
    });

    // Create prompt for GPT
    const prompt = `Analyze the following Bitcoin price and RSI data for bullish and bearish divergences.

    Rules for identifying divergences:
    - Bullish divergence: Price makes a lower low while RSI makes a higher low.
    - Bearish divergence: Price makes a higher high while RSI makes a lower high.
    - Consider divergences within a 20-candle window.

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
                "confidence": number
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
                "confidence": number
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
                    content: "You are a technical analysis expert specializing in divergence detection. Respond only with valid JSON matching the specified format."
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
            console.log(`\nBullish Divergence #${index + 1}:`);
            console.log(`Start: ${div.startDate}`);
            console.log(`End: ${div.endDate}`);
            console.log(`Price: ${div.startPrice} → ${div.endPrice}`);
            console.log(`RSI: ${div.startRsi.toFixed(2)} → ${div.endRsi.toFixed(2)}`);
            console.log(`Confidence: ${(div.confidence * 100).toFixed(1)}%`);
        });

        console.log('\n----------------------------------------');
        
        console.log(`\nFound ${divergences.bearishDivergences.length} bearish divergences:`);
        divergences.bearishDivergences.forEach((div, index) => {
            console.log(`\nBearish Divergence #${index + 1}:`);
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