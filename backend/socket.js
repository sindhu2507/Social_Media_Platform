import { Server } from "socket.io";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: ['http://localhost:3000', 'http://localhost:5173'], methods: ['GET', 'POST'] }, // Match backend CORS
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      try {
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
          conversation = new Conversation({
            participants: [senderId, receiverId],
          });
          await conversation.save();
        }

        const message = new Message({
          conversationId: conversation._id,
          sender: senderId,
          receiver: receiverId,
          content,
        });
        await message.save();

        conversation.lastMessage = content;
        conversation.updatedAt = Date.now();
        await conversation.save();

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username")
          .populate("receiver", "username");

        io.to(senderId).to(receiverId).emit("receiveMessage", populatedMessage);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export default setupSocket;