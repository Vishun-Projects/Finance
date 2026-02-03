const net = require('net');

// Parse from .env or hardcode for test
// DATABASE_URL=postgresql://postgres:Vishun%4090211%23@db.ijdjyycknaizldysgnfx.supabase.co:5432/postgres
const host = 'aws-1-ap-southeast-2.pooler.supabase.com';
const port = 6543;

console.log(`Pinging ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000); // 5s timeout

socket.on('connect', () => {
    console.log('✅ TCP Connection Successful!');
    socket.destroy();
});

socket.on('timeout', () => {
    console.log('❌ Connection Timed Out. Firewalls or Server is Paused?');
    socket.destroy();
});

socket.on('error', (err) => {
    console.log('❌ Connection Error:', err.message);
});

socket.connect(port, host);
