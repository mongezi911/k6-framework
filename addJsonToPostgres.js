const { Pool } = require('pg');
const fs = require('fs');
const readline = require('readline');

// PostgreSQL connection setup
const pool = new Pool({
    user: 'test',  
    host: 'localhost',
    database: 'testdb',  
    password: 'test',  
    port: 5432,
});

// Function to insert K6 results into PostgreSQL
async function insertK6Results(data) {
    // We check for the 'type' property to find the points
    if (data.type === 'Point') {
        const metricName = data.metric;  // This is where the metric name is stored
        const timestamp = new Date(data.data.time).toISOString();  // Convert the time string to ISO timestamp
        const value = data.data.value;  // The value of the metric point
        const tags = JSON.stringify(data.data.tags);  // Convert tags object to JSON string

        // Debugging: Log the data being inserted
        console.log(`Inserting data: Metric: ${metricName}, Timestamp: ${timestamp}, Value: ${value}, Tags: ${tags}`);

        try {
            // Insert into PostgreSQL
            const res = await pool.query(
                'INSERT INTO k6_results (metric_name, timestamp, value, tags) VALUES ($1, $2, $3, $4)',
                [metricName, timestamp, value, tags]
            );
            console.log('Insert Result:', res);  // Log the result of the query
        } catch (err) {
            console.error('Error inserting data:', err.message);
        }
    }
}

// Read file line by line and parse JSON
async function processFile(filePath) {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const parsedData = JSON.parse(line);
            
            // Debugging: Log the parsed JSON data
            console.log('Parsed Data:', parsedData);

            await insertK6Results(parsedData);
        } catch (err) {
            console.error('Error parsing JSON data:', err.message);
        }
    }
}

// Specify the JSON file to process
processFile('output.json')
    .then(() => {
        console.log('File processed successfully');
        return pool.end();  // Close the pool after processing
    })
    .catch(err => console.error('Error processing file:', err.message));
