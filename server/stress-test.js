/**
 * 🧪 WHALIO STUDY - STRESS TEST SCRIPT
 * =====================================
 * Tác giả: Bình (với sự hỗ trợ của GitHub Copilot)
 * Mục đích: Tìm "Ngưỡng Tử Thần" của server - điểm mà server bắt đầu gãy
 * 
 * Sử dụng: node stress-test.js
 * Yêu cầu: npm install autocannon (nếu chưa có)
 */

const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// ==================== CẤU HÌNH TEST ====================
const CONFIG = {
    // URL endpoint cần test (health check không cần MongoDB)
    url: 'http://localhost:10000/api/health',
    
    // Các mức connection sẽ test (tăng dần)
    connectionLevels: [100, 200, 500, 1000, 2000, 3000, 5000],
    
    // Thời gian mỗi đợt test (giây)
    durationPerTest: 10,
    
    // Ngưỡng "gãy" - Latency tối đa chấp nhận được (ms)
    maxAcceptableLatency: 1000,
    
    // Ngưỡng error rate tối đa chấp nhận được (%)
    maxAcceptableErrorRate: 1,
    
    // Pipeline (số request gửi song song trên 1 connection)
    pipelining: 1,
    
    // Timeout cho mỗi request (ms)
    timeout: 10000
};

// ==================== BIẾN LƯU KẾT QUẢ ====================
const testResults = [];
let breakPoint = null;
let maxSafeConnections = 0;
let maxRPS = 0;

// ==================== HÀM HELPER ====================

/**
 * Format số với dấu phẩy ngăn cách hàng nghìn
 */
function formatNumber(num) {
    return num.toLocaleString('vi-VN');
}

/**
 * Tính error rate từ kết quả autocannon
 */
function calculateErrorRate(result) {
    const total = result.requests.total || 0;
    const errors = (result.errors || 0) + (result.timeouts || 0) + (result.non2xx || 0);
    return total > 0 ? (errors / total) * 100 : 0;
}

/**
 * Kiểm tra xem server đã "gãy" chưa
 */
function isServerBroken(result) {
    const latency = result.latency.p99;
    const errorRate = calculateErrorRate(result);
    const hasErrors = result.errors > 0 || result.timeouts > 0;
    
    return (
        latency > CONFIG.maxAcceptableLatency ||
        errorRate > CONFIG.maxAcceptableErrorRate ||
        hasErrors
    );
}

/**
 * In header đẹp
 */
function printHeader(text) {
    const line = '═'.repeat(60);
    console.log(`\n${line}`);
    console.log(`  ${text}`);
    console.log(line);
}

/**
 * In kết quả một đợt test
 */
function printTestResult(connections, result, isBroken) {
    const status = isBroken ? '❌ GÃY' : '✅ ỔN';
    const errorRate = calculateErrorRate(result).toFixed(2);
    
    console.log(`\n📊 KẾT QUẢ: ${connections} connections`);
    console.log(`   ├─ Trạng thái: ${status}`);
    console.log(`   ├─ Throughput: ${formatNumber(Math.round(result.requests.average))} req/s`);
    console.log(`   ├─ Latency (p50): ${result.latency.p50}ms`);
    console.log(`   ├─ Latency (p99): ${result.latency.p99}ms`);
    console.log(`   ├─ Errors: ${result.errors || 0}`);
    console.log(`   ├─ Timeouts: ${result.timeouts || 0}`);
    console.log(`   ├─ Non-2xx: ${result.non2xx || 0}`);
    console.log(`   └─ Error Rate: ${errorRate}%`);
}

/**
 * Chạy một đợt test với số connection cụ thể
 */
async function runSingleTest(connections) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Bắt đầu test với ${formatNumber(connections)} connections...`);
        
        const instance = autocannon({
            url: CONFIG.url,
            connections: connections,
            duration: CONFIG.durationPerTest,
            pipelining: CONFIG.pipelining,
            timeout: CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
        
        // Progress tracking
        autocannon.track(instance, {
            renderProgressBar: true,
            renderResultsTable: false
        });
    });
}

/**
 * Chạy toàn bộ stress test
 */
async function runStressTest() {
    printHeader('🧪 WHALIO STUDY - STRESS TEST');
    
    console.log('\n📋 CẤU HÌNH TEST:');
    console.log(`   ├─ URL: ${CONFIG.url}`);
    console.log(`   ├─ Connection Levels: ${CONFIG.connectionLevels.join(', ')}`);
    console.log(`   ├─ Duration/Test: ${CONFIG.durationPerTest}s`);
    console.log(`   ├─ Max Latency: ${CONFIG.maxAcceptableLatency}ms`);
    console.log(`   └─ Max Error Rate: ${CONFIG.maxAcceptableErrorRate}%`);
    
    console.log('\n⏳ Bắt đầu stress test trong 3 giây...');
    await new Promise(r => setTimeout(r, 3000));
    
    for (const connections of CONFIG.connectionLevels) {
        try {
            const result = await runSingleTest(connections);
            const isBroken = isServerBroken(result);
            
            // Lưu kết quả
            const testData = {
                connections,
                rps: Math.round(result.requests.average),
                latencyP50: result.latency.p50,
                latencyP99: result.latency.p99,
                latencyAvg: result.latency.average,
                errors: result.errors || 0,
                timeouts: result.timeouts || 0,
                non2xx: result.non2xx || 0,
                errorRate: calculateErrorRate(result),
                isBroken,
                timestamp: new Date().toISOString()
            };
            testResults.push(testData);
            
            // In kết quả
            printTestResult(connections, result, isBroken);
            
            // Cập nhật max RPS và safe connections
            if (!isBroken && result.requests.average > maxRPS) {
                maxRPS = result.requests.average;
                maxSafeConnections = connections;
            }
            
            // Ghi nhận break point
            if (isBroken && !breakPoint) {
                breakPoint = {
                    connections,
                    firstError: result.errors > 0 ? 'Connection Error' : 
                               result.timeouts > 0 ? 'Timeout' : 
                               result.latency.p99 > CONFIG.maxAcceptableLatency ? 'High Latency' : 'Unknown',
                    rps: result.requests.average,
                    latencyP99: result.latency.p99
                };
                console.log('\n⚠️  BREAK POINT DETECTED! Server bắt đầu "gãy" tại mức này.');
            }
            
            // Nghỉ 5 giây giữa các test để server recover
            if (connections !== CONFIG.connectionLevels[CONFIG.connectionLevels.length - 1]) {
                console.log('\n⏸️  Nghỉ 5 giây để server recovery...');
                await new Promise(r => setTimeout(r, 5000));
            }
            
        } catch (error) {
            console.error(`\n❌ Test ${connections} connections thất bại:`, error.message);
            
            if (!breakPoint) {
                breakPoint = {
                    connections,
                    firstError: 'Test Failure',
                    errorMessage: error.message
                };
            }
            break;
        }
    }
    
    // In báo cáo tổng kết
    printFinalReport();
    
    // Lưu kết quả ra file
    saveResultsToFile();
}

/**
 * In báo cáo tổng kết cuối cùng
 */
function printFinalReport() {
    printHeader('📈 BÁO CÁO TỔNG KẾT');
    
    console.log('\n🎯 KẾT QUẢ STRESS TEST:');
    console.log('─'.repeat(50));
    
    if (breakPoint) {
        console.log(`\n🔴 ĐIỂM GÃY (BREAK POINT):`);
        console.log(`   ├─ Connections: ${formatNumber(breakPoint.connections)}`);
        console.log(`   ├─ Lý do: ${breakPoint.firstError}`);
        if (breakPoint.rps) {
            console.log(`   ├─ RPS tại điểm gãy: ${formatNumber(Math.round(breakPoint.rps))}`);
        }
        if (breakPoint.latencyP99) {
            console.log(`   └─ Latency P99: ${breakPoint.latencyP99}ms`);
        }
    } else {
        console.log(`\n✅ Server vượt qua tất cả các mức test!`);
    }
    
    console.log(`\n🟢 NGƯỠNG AN TOÀN TỐI ĐA:`);
    console.log(`   ├─ Max Safe Connections: ${formatNumber(maxSafeConnections)}`);
    console.log(`   └─ Max Safe RPS: ${formatNumber(Math.round(maxRPS))} req/s`);
    
    // Tính toán capacity
    const safeRPSDaily = maxRPS * 60 * 60 * 24;
    const safeUsersEstimate = Math.floor(maxRPS / 2); // Giả sử 2 req/user/second
    
    console.log(`\n📊 CAPACITY ESTIMATION:`);
    console.log(`   ├─ Estimated Daily Capacity: ~${formatNumber(Math.round(safeRPSDaily))} requests`);
    console.log(`   └─ Estimated Concurrent Users: ~${formatNumber(safeUsersEstimate)} users`);
    
    // Khuyến nghị
    console.log(`\n💡 KHUYẾN NGHỊ:`);
    if (breakPoint && breakPoint.connections <= 500) {
        console.log('   ⚠️  Server có capacity thấp. Cần tối ưu hóa ngay!');
        console.log('   📌 Xem phần "TỐI ƯU HÓA" trong báo cáo đầy đủ.');
    } else if (breakPoint && breakPoint.connections <= 1000) {
        console.log('   ⚡ Server ở mức trung bình. Có thể cải thiện thêm.');
    } else {
        console.log('   ✅ Server có capacity tốt cho production.');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('  🏁 STRESS TEST HOÀN TẤT');
    console.log('═'.repeat(60) + '\n');
}

/**
 * Lưu kết quả ra file JSON
 */
function saveResultsToFile() {
    const report = {
        testConfig: CONFIG,
        testDate: new Date().toISOString(),
        breakPoint,
        maxSafeConnections,
        maxRPS: Math.round(maxRPS),
        results: testResults,
        summary: {
            totalTests: testResults.length,
            passedTests: testResults.filter(r => !r.isBroken).length,
            failedTests: testResults.filter(r => r.isBroken).length
        }
    };
    
    const filename = `stress-test-results-${Date.now()}.json`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📁 Kết quả đã lưu vào: ${filename}`);
}

// ==================== CHẠY TEST ====================
console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🐋 WHALIO STUDY - SERVER STRESS TEST                    ║
║                                                            ║
║   Tìm "Ngưỡng Tử Thần" của server                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Kiểm tra server có đang chạy không
const http = require('http');
const testUrl = new URL(CONFIG.url);

console.log(`🔍 Kiểm tra server tại ${CONFIG.url}...`);

http.get(CONFIG.url, (res) => {
    console.log(`✅ Server đang chạy! Status: ${res.statusCode}`);
    runStressTest().catch(console.error);
}).on('error', (err) => {
    console.error(`\n❌ KHÔNG THỂ KẾT NỐI ĐẾN SERVER!`);
    console.error(`   URL: ${CONFIG.url}`);
    console.error(`   Error: ${err.message}`);
    console.log(`\n💡 Hãy đảm bảo:`);
    console.log(`   1. Server đang chạy: cd server && node index.js`);
    console.log(`   2. Port 10000 đang được sử dụng`);
    console.log(`   3. Đã tắt Rate Limiting trong index.js (xem hướng dẫn)`);
    process.exit(1);
});
