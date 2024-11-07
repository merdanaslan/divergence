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
    const data = rows.slice(1).map(row => {
        const values = row.split(',');
        return {
            timestamp: values[0],
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
        "bullishDivergences": number,
        "bearishDivergences": number
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
        
        // Save divergences to a JSON file
        fs.writeFileSync('divergences.json', JSON.stringify(divergences, null, 2));

        // Log the results
        console.log(`Bullish Divergences: ${divergences.bullishDivergences}`);
        console.log(`Bearish Divergences: ${divergences.bearishDivergences}`);
        
    } catch (error) {
        console.error('Error analyzing divergences with AI:', error);
    }
}

analyzeDivergencesWithAI();