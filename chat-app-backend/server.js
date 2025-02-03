const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const users = {}; // Stores username -> socket.id mapping
const unreadMessages = {}; // { sender: { recipient: count } }

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    users[username] = socket.id;
    io.emit("update_users", Object.keys(users)); // Update online users
  });

  socket.on("send_private_message", ({ sender, recipient, text }) => {
    const recipientSocketId = users[recipient];

    // Store unread messages count
    if (!unreadMessages[recipient]) unreadMessages[recipient] = {};
    unreadMessages[recipient][sender] =
      (unreadMessages[recipient][sender] || 0) + 1;

    io.to(recipientSocketId).emit("receive_private_message", { sender, text });
    io.to(recipientSocketId).emit(
      "update_unread_messages",
      unreadMessages[recipient]
    );
  });

  socket.on("mark_messages_as_read", ({ user, sender }) => {
    if (unreadMessages[user] && unreadMessages[user][sender]) {
      delete unreadMessages[user][sender];
    }
    io.to(users[user]).emit(
      "update_unread_messages",
      unreadMessages[user] || {}
    );
  });

  socket.on("typing", ({ sender, recipient }) => {
    if (users[recipient]) {
      io.to(users[recipient]).emit("user_typing", sender);
    }
  });

  socket.on("stop_typing", ({ recipient }) => {
    if (users[recipient]) {
      io.to(users[recipient]).emit("user_stopped_typing");
    }
  });

  socket.on("disconnect", () => {
    for (let user in users) {
      if (users[user] === socket.id) {
        delete users[user];
        break;
      }
    }
    io.emit("update_users", Object.keys(users));
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
