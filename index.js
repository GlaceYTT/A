import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { botController } from './botController.js';
import os from 'os';
import path from 'path';
const app = express();
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(cors({
    origin: '*', // Allow all origins for public web panel
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'userId', 'botId'],
    credentials: true
}));

app.use(bodyParser.json());
app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    res.sendFile(imagePath);
});

function getServerInfo() {
    const networkInterfaces = os.networkInterfaces();
    const addresses = [];
    
    // Get all network addresses
    for (const interfaceName of Object.keys(networkInterfaces)) {
        for (const address of networkInterfaces[interfaceName]) {
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        addresses: addresses,
        localhost: '127.0.0.1'
    };
}


function authenticate(req, res, next) {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();
    
    // Skip authentication for OPTIONS requests and GET requests
    if (req.method === 'OPTIONS' || req.method === 'GET') {
        console.log(`[${timestamp}] [${clientIp}] ${req.method} ${req.path} - Skipping auth`);
        return next();
    }

   
    const { userId, botId } = req.body || {};
    
    console.log(`[${timestamp}] [${clientIp}] AUTH REQUEST: userId=${userId}, botId=${botId}, endpoint=${req.path}`);

    if (!userId || !botId) {
        console.log(`[${timestamp}] [${clientIp}] AUTH FAILED: Missing credentials`);
        return res.status(401).json({ 
            error: 'Missing userId or botId',
            timestamp: timestamp,
            required: ['userId', 'botId']
        });
    }

    // Store for use in route handlers
    req.userId = userId;
    req.botId = botId;
    req.clientIp = clientIp;
    req.timestamp = timestamp;
    
    console.log(`[${timestamp}] [${clientIp}] AUTH SUCCESS: User authenticated`);
    next();
}

app.use(authenticate);

// Enhanced /play route with detailed logging
app.post('/play', async (req, res) => {
    const { query } = req.body;
    const { userId, clientIp, timestamp } = req;
    
    console.log(`[${timestamp}] [${clientIp}] PLAY REQUEST: "${query}" for userId=${userId}`);

    try {
        const result = await botController.playSong(userId, query);
        const response = { 
            success: true, 
            message: `Playing: ${result.title}`,
            title: result.title,
            timestamp: timestamp
        };
        
        console.log(`[${timestamp}] [${clientIp}] PLAY SUCCESS: ${result.title}`);
        res.json(response);
    } catch (err) {
        console.error(`[${timestamp}] [${clientIp}] PLAY ERROR:`, err.message);
        res.status(500).json({ 
            error: err.message, 
            timestamp: timestamp,
            userId: userId
        });
    }
});

// Enhanced /pause route
app.post('/pause', async (req, res) => {
    const { userId, clientIp, timestamp } = req;
    console.log(`[${timestamp}] [${clientIp}] PAUSE REQUEST: userId=${userId}`);
    
    try {
        await botController.pause(userId);
        console.log(`[${timestamp}] [${clientIp}] PAUSE SUCCESS`);
        res.json({ success: true, timestamp: timestamp });
    } catch (err) {
        console.error(`[${timestamp}] [${clientIp}] PAUSE ERROR:`, err.message);
        res.status(500).json({ 
            error: err.message, 
            timestamp: timestamp 
        });
    }
});

// Enhanced /resume route
app.post('/resume', async (req, res) => {
    const { userId, clientIp, timestamp } = req;
    console.log(`[${timestamp}] [${clientIp}] RESUME REQUEST: userId=${userId}`);
    
    try {
        await botController.resume(userId);
        console.log(`[${timestamp}] [${clientIp}] RESUME SUCCESS`);
        res.json({ success: true, timestamp: timestamp });
    } catch (err) {
        console.error(`[${timestamp}] [${clientIp}] RESUME ERROR:`, err.message);
        res.status(500).json({ 
            error: err.message, 
            timestamp: timestamp 
        });
    }
});

// Enhanced /skip route
app.post('/skip', async (req, res) => {
    const { userId, clientIp, timestamp } = req;
    console.log(`[${timestamp}] [${clientIp}] SKIP REQUEST: userId=${userId}`);
    
    try {
        await botController.skip(userId);
        console.log(`[${timestamp}] [${clientIp}] SKIP SUCCESS`);
        res.json({ success: true, timestamp: timestamp });
    } catch (err) {
        console.error(`[${timestamp}] [${clientIp}] SKIP ERROR:`, err.message);
        res.status(500).json({ 
            error: err.message, 
            timestamp: timestamp 
        });
    }
});

// New /stop route
app.post('/stop', async (req, res) => {
    const { userId, clientIp, timestamp } = req;
    console.log(`[${timestamp}] [${clientIp}] STOP REQUEST: userId=${userId}`);
    
    try {
        await botController.stop(userId);
        console.log(`[${timestamp}] [${clientIp}] STOP SUCCESS`);
        res.json({ success: true, timestamp: timestamp });
    } catch (err) {
        console.error(`[${timestamp}] [${clientIp}] STOP ERROR:`, err.message);
        res.status(500).json({ 
            error: err.message, 
            timestamp: timestamp 
        });
    }
});

// Enhanced health check endpoint with server info
app.get('/health', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();
    const serverInfo = getServerInfo();
    
    console.log(`[${timestamp}] [${clientIp}] HEALTH CHECK`);
    
    res.json({ 
        status: 'OK', 
        timestamp: timestamp,
        server: serverInfo,
        uptime: process.uptime(),
        version: '2.0.0-multi-tenant'
    });
});

// New endpoint to get server connection info
app.get('/info', (req, res) => {
    const PORT = process.env.PORT || 3000;
    const serverInfo = getServerInfo();
    const timestamp = new Date().toISOString();
    
    // Generate possible API URLs
    const apiUrls = [
        `http://localhost:${PORT}`,
        `http://127.0.0.1:${PORT}`,
        ...serverInfo.addresses.map(addr => `http://${addr}:${PORT}`)
    ];
    
    res.json({
        timestamp: timestamp,
        port: PORT,
        hostname: serverInfo.hostname,
        platform: serverInfo.platform,
        apiUrls: apiUrls,
        primaryUrl: apiUrls[0],
        externalUrls: serverInfo.addresses.map(addr => `http://${addr}:${PORT}`)
    });
});

// 404 handler
app.use((req, res) => {
    const timestamp = new Date().toISOString();
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    console.log(`[${timestamp}] [${clientIp}] 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Endpoint not found',
        timestamp: timestamp,
        availableEndpoints: ['/health', '/info', '/play', '/pause', '/resume', '/skip', '/stop']
    });
});

// Server startup with enhanced logging
const PORT = process.env.PORT || 3000;
const serverInfo = getServerInfo();

app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🎵 ===============================');
    console.log('🎵  SSRR Multi-Tenant Music API  ');
    console.log('🎵 ===============================\n');
    
    console.log(`🚀 Server Status: ONLINE`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`💻 Hostname: ${serverInfo.hostname}`);
    console.log(`🖥️  Platform: ${serverInfo.platform}\n`);
    
    console.log('📡 Available API URLs:');
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Local:    http://127.0.0.1:${PORT}`);
    
    if (serverInfo.addresses.length > 0) {
        console.log('   Network:');
        serverInfo.addresses.forEach(addr => {
            console.log(`             http://${addr}:${PORT}`);
        });
    }
    
    console.log('\n🔗 API Endpoints:');
    console.log('   GET  /health  - Health check');
    console.log('   GET  /info    - Server information');
    console.log('   POST /play    - Play music');
    console.log('   POST /pause   - Pause playback');
    console.log('   POST /resume  - Resume playback');
    console.log('   POST /skip    - Skip current song');
    console.log('   POST /stop    - Stop playback');
    
    console.log('\n📋 Usage Instructions:');
    console.log('   1. Share any of the above URLs with users');
    console.log('   2. Users enter the URL in the web panel');
    console.log('   3. Users provide their Discord User ID and Bot ID');
    console.log('   4. Users can control their bot remotely\n');
    
    console.log('🎵 ===============================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully');
    process.exit(0);
});
