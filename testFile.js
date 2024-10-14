import http from 'k6/http';
import { check, sleep } from 'k6';
import { encode } from 'k6/encoding';
import { randomSeed } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";


export let options = {
    stages: [
        { duration: '30s', target: 1 },
        { duration: '1m', target: 1 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
    },
    ext: {
        influxdb: {
            address: 'http://localhost:8086', 
            token: 'HXYuLJsmyxNhZ2zlV_PlOj8sGTLJL4wllHLyXkbrKgUvON1W0g0F1SnTT41mysVoRNRS6RC0TC3HRcqfRt-fsA==',
            org: 'test',
            bucket: 'test',
            tags: { env: 'local' },
        },
    },
};

export default function () {
    let uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 15);

    // Create the file content dynamically
    let fileContent = `dummy file content for file ID: ${uniqueId}`;
    
    // Use http.file() to create a file object
    let fileData = http.file(fileContent, `dummyfile-${uniqueId}.txt`, 'text/plain');

    // Send a multipart/form-data request to the CIP store API
    let cipResponse = http.post('http://localhost:3001/api/cip/store', {
        file: fileData,  // Pass the file data as form field
    });

    check(cipResponse, {
        'File stored in CIP': (res) => res.status === 200,
    });

    // Handle S3 upload and notification in separate requests
    let s3Response = http.post('http://localhost:3001/api/s3/upload');

    check(s3Response, {
        'Files uploaded to S3': (res) => res.status === 200,
    });

    let notifyResponse = http.post('http://localhost:3001/api/notify');

    check(notifyResponse, {
        'Notification sent': (res) => res.status === 200,
    });

    sleep(1);
}

export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data),
    };
}