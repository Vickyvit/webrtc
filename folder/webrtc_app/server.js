import express from "express";
import { createServer } from "https";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read SSL certificate and key
const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

// Create HTTPS server
const server = createServer({ key, cert }, app);

// Allow CORS for local and network access
const io = new Server(server, {
    cors: {
        origin: [
            "https://localhost",
            "https://192.168.1.6"
        ],
        methods: ["GET", "POST"]
    }
});

const allusers = {};

// Serve static files
app.use(express.static("public"));

// Serve the main page
app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(join(__dirname + "/app/index.html"));
});

// Socket.IO logic
io.on("connection", (socket) => {
    console.log(`Someone connected to socket server and socket id is ${socket.id}`);
    
    socket.on("join-user", username => {
        console.log(`${username} joined socket connection`);
        allusers[username] = { username, id: socket.id };
        io.emit("joined", allusers);
    });

    socket.on("offer", ({from, to, offer}) => {
        console.log({from , to, offer });
        io.to(allusers[to].id).emit("offer", {from, to, offer});
    });

    socket.on("answer", ({from, to, answer}) => {
       io.to(allusers[from].id).emit("answer", {from, to, answer});
    });

    socket.on("end-call", ({from, to}) => {
        io.to(allusers[to].id).emit("end-call", {from, to});
    });

    socket.on("call-ended", caller => {
        const [from, to] = caller;
        io.to(allusers[from].id).emit("call-ended", caller);
        io.to(allusers[to].id).emit("call-ended", caller);
    });

    socket.on("icecandidate", candidate => {
        console.log({ candidate });
        socket.broadcast.emit("icecandidate", candidate);
    }); 
});

// Start HTTPS server on port 8181
server.listen(9000, () => {
    console.log(`HTTPS Server running at https://192.168.1.6:9000`);
});
