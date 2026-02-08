const net = require('net');

// Parse from .env
require('dotenv').config();
const dbUrl = process.env.DATABASE_URL;

let host = 'localhost';
let port = 5432;

if (dbUrl) {
    try {
        const parsed = new URL(dbUrl);
        host = parsed.hostname;
        port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'postgresql:' ? 5432 : 3306);
    } catch (e) {
        console.warn('⚠️ Could not parse DATABASE_URL, using defaults');
    }
}

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
