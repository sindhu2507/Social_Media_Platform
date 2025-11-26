
import express from "express";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Get conversations for the authenticated user
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId,
    })
      .populate("participants", "username")
      .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map((conv) => ({
      userId: conv.participants.find((p) => p._id.toString() !== req.userId)._id,
      username: conv.participants.find((p) => p._id.toString() !== req.userId).username,
      lastMessage: conv.lastMessage,
    }));

    res.json(formattedConversations);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get messages for a conversation with a specific user
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [req.userId, req.params.userId] },
    });
    if (!conversation) return res.json([]);

    const messages = await Message.find({ conversationId: conversation._id })
      .populate("sender", "username")
      .populate("receiver", "username");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get unread message counts
router.get('/unread', verifyToken, async (req, res) => {
  try {
    const userId = req.userId; // Changed from req.user._id to req.userId
    const unreadMessages = await Message.find({
      receiver: userId,
      read: false,
    }).populate('sender');

    const unreadCounts = {};
    unreadMessages.forEach(msg => {
      if (msg.sender) {
        unreadCounts[msg.sender._id] = (unreadCounts[msg.sender._id] || 0) + 1;
      }
    });

    res.json(unreadCounts);
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
