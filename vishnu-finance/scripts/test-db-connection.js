const net = require('net');
const dns = require('dns');

// Hardcoding for the test based on previous findings
const poolerHost = 'aws-1-ap-southeast-2.pooler.supabase.com';
const directHost = 'db.ijdjyycknaizldysgnfx.supabase.co';

async function testConnection(label, host, port) {
    console.log(`\n--- Testing ${label} [${host}:${port}] ---`);

    return new Promise((resolve) => {
        dns.lookup(host, { all: true }, (err, addresses) => {
            if (err) {
                console.error(`❌ DNS Lookup failed for ${host}: ${err.message}`);
                resolve();
                return;
            }

            console.log(`✔ DNS Resolved ${addresses.length} address(es):`);
            addresses.forEach(addr => console.log(`   - ${addr.address} (IPv${addr.family})`));

            let completed = 0;
            if (addresses.length === 0) resolve();

            addresses.forEach(addr => {
                const socket = new net.Socket();
                socket.setTimeout(5000);
                const startTime = Date.now();

                socket.on('connect', () => {
                    const time = Date.now() - startTime;
                    console.log(`   ✅ Connected to ${addr.address} (IPv${addr.family}) in ${time}ms`);
                    socket.destroy();
                    completed++;
                    if (completed === addresses.length) resolve();
                });

                socket.on('timeout', () => {
                    console.log(`   ❌ Timeout connecting to ${addr.address} (IPv${addr.family})`);
                    socket.destroy();
                    completed++;
                    if (completed === addresses.length) resolve();
                });

                socket.on('error', (err) => {
                    console.log(`   ❌ Error connecting to ${addr.address} (IPv${addr.family}): ${err.message}`);
                    completed++;
                    if (completed === addresses.length) resolve();
                });

                socket.connect(port, addr.address);
            });
        });
    });
}

(async () => {
    console.log('Starting Supavisor Session Mode Test...');

    // Test Pooler Host on Port 5432 (Session Mode)
    // This is the critical test: can we get IPv4 Session Mode?
    await testConnection('POOLER HOST (Session Mode / Port 5432)', poolerHost, 5432);

    console.log('\n--- Test Complete ---');
})();
