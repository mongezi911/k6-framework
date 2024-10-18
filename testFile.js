import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export let options = {
    stages: [
        { duration: '1m', target: 0 }, 
        { duration: '1s', target: 10 },
        { duration: '1m', target: 0 }, 
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // Ensure 95% of requests complete in < 500ms
    },
};

// Simulate file upload and processing in batches
export default function () {
    // File content to upload
    let fileContent = 'dummy file content';

    // Batch of 100 file uploads
    for (let i = 0; i < 100; i++) {
        let uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        let fileData = http.file(fileContent, `dummyfile-${uniqueId}.txt`, 'text/plain');

        // Send file upload request
        let response = http.post('http://localhost:3001/api/cip/store', {
            file: fileData,
        });

        // Check if the file was uploaded successfully
        check(response, {
            'File stored successfully': (res) => res.status === 200,
        });

        // Simulate a small delay between uploads in the batch
        sleep(0.1); // Sleep for 100ms between file uploads
    }

    // Polling mechanism to ensure all files processed
    let allProcessed = false;
    let maxPollAttempts = 60; // Max polling attempts (polling every 10 seconds for 10 minutes)

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        let pollResponse = http.get('http://localhost:3001/api/cip/status');
        
        allProcessed = check(pollResponse, {
            'All files processed': (res) => JSON.parse(res.body).allProcessed === true,
        });

        // If all files are processed, break out of the loop early
        if (allProcessed) {
            console.log(`All files processed after ${attempt + 1} attempts.`);
            break;
        }

        sleep(10); // Poll every 10 seconds
    }

    // Ensure polling did not exceed the max attempts
    if (!allProcessed) {
        console.error('Files were not processed within the 10-minute time window.');
    }

    // Wait for the next batch (controlled by stages)
    sleep(600); // Sleep for 10 minutes
}

// Generate HTML report
export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data),
    };
}
