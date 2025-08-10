const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.static('public')); // Serve static files if needed (e.g., for hosting index.html)

// Serve a simple HTML page at /
app.get('/', (req, res) => {
    res.send('<h1>Chat Server is running 🚀</h1>');
});

// Store seen status for messages
const messageSeenStatus = new Map(); // Map<messageId, Set<username>>

io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on('join', (username) => {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            console.log('Invalid username received');
            socket.emit('message', {
                username: 'System',
                message: 'Invalid username. Please try again.',
                id: uuidv4()
            });
            return;
        }
        socket.username = username.trim();
        console.log(`${socket.username} joined the chat`);
        // Broadcast join message to all clients except the sender
        socket.broadcast.emit('message', {
            username: 'System',
            message: `${socket.username} has joined the chat`,
            id: uuidv4()
        });
        // Send welcome message to the joining client
        socket.emit('message', {
            username: 'System',
            message: `Welcome to the chat, ${socket.username}!`,
            id: uuidv4()
        });
    });

    socket.on('message', (data) => {
        if (!data || !data.username || !data.message || typeof data.message !== 'string') {
            console.log('Invalid message data received');
            return;
        }
        const messageId = uuidv4();
        console.log(`Message received from ${data.username}: ${data.message} (ID: ${messageId})`);
        messageSeenStatus.set(messageId, new Set()); // Initialize seen status for this message
        io.emit('message', {
            username: data.username,
            message: data.message.trim(),
            id: messageId
        }); // Broadcast to all clients
    });

    socket.on('image', (data) => {
        if (!data || !data.username || !data.image || typeof data.image !== 'string') {
            console.log('Invalid image data received');
            return;
        }
        const messageId = uuidv4();
        console.log(`Image received from: ${data.username} (ID: ${messageId})`);
        messageSeenStatus.set(messageId, new Set()); // Initialize seen status for this image
        io.emit('image', {
            username: data.username,
            image: data.image,
            id: messageId
        }); // Broadcast to all clients
    });

    socket.on('voice', (data) => {
        if (!data || !data.username || !data.audio || typeof data.audio !== 'string' || !data.duration) {
            console.log('Invalid voice data received');
            return;
        }
        const messageId = uuidv4();
        console.log(`Voice message received from: ${data.username} (ID: ${messageId})`);
        messageSeenStatus.set(messageId, new Set()); // Initialize seen status for this voice message
        io.emit('voice', {
            username: data.username,
            audio: data.audio,
            duration: data.duration,
            id: messageId
        }); // Broadcast to all clients
    });

    socket.on('seen', (data) => {
        if (!data || !data.messageId || !data.username || typeof data.username !== 'string') {
            console.log('Invalid seen data received');
            return;
        }
        const seenBy = messageSeenStatus.get(data.messageId);
        if (seenBy) {
            seenBy.add(data.username);
            console.log(`Message ${data.messageId} seen by ${data.username}`);
            io.emit('seen_update', {
                messageId: data.messageId,
                seenBy: Array.from(seenBy)
            });
        }
    });

    socket.on('typing', (data) => {
        if (!data || !data.username || typeof data.username !== 'string') {
            console.log('Invalid typing data received');
            return;
        }
        console.log(`${data.username} is typing`);
        socket.broadcast.emit('typing', {
            username: data.username
        }); // Broadcast to all except sender
    });

    socket.on('stopTyping', (data) => {
        if (!data || !data.username || typeof data.username !== 'string') {
            console.log('Invalid stopTyping data received');
            return;
        }
        console.log(`${data.username} stopped typing`);
        socket.broadcast.emit('stopTyping', {
            username: data.username
        }); // Broadcast to all except sender
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            console.log(`${socket.username} disconnected`);
            io.emit('message', {
                username: 'System',
                message: `${socket.username} has left the chat`,
                id: uuidv4()
            });
        } else {
            console.log(`Unnamed user disconnected: ${socket.id}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}/`);
});