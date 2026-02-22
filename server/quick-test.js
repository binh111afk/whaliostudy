const http = require('http');

const TARGET = 'http://localhost:10000/api/health';
const DURATION = 5000; // 5 giây
const CONCURRENT = 10; // 10 request song song

let completed = 0;
let errors = 0;
const latencies = [];

function makeRequest() {
    const start = Date.now();
    
    http.get(TARGET, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            const latency = Date.now() - start;
            latencies.push(latency);
            completed++;
            
            if (Date.now() - testStart < DURATION) {
                makeRequest(); // Keep sending
            }
        });
    }).on('error', (err) => {
        errors++;
        console.error('Error:', err.message);
        if (Date.now() - testStart < DURATION) {
            makeRequest();
        }
    });
}

console.log(`\n🧪 RAW PERFORMANCE TEST`);
console.log(`Target: ${TARGET}`);
console.log(`Duration: ${DURATION / 1000}s`);
console.log(`Concurrent: ${CONCURRENT}`);
console.log(`Starting...\n`);

const testStart = Date.now();

// Start concurrent requests
for (let i = 0; i < CONCURRENT; i++) {
    makeRequest();
}

// Report results
setTimeout(() => {
    const duration = (Date.now() - testStart) / 1000;
    const rps = completed / duration;
    
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Duration: ${duration.toFixed(2)}s`);
    console.log(`   Throughput: ${rps.toFixed(2)} req/s`);
    console.log(`   Latency AVG: ${avg.toFixed(2)}ms`);
    console.log(`   Latency P50: ${p50}ms`);
    console.log(`   Latency P99: ${p99}ms\n`);
    
    process.exit(0);
}, DURATION + 1000);
