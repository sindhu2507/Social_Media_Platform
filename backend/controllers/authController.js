import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import User from "../models/User.js";
import Post from "../models/Post.js";

// Function for user registration
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      profilePic: null, // Default value to match schema
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function for user login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function for uploading profile picture
const uploadProfilePic = async (req, res) => {
  try {
    const userId = req.user._id; // Use req.user._id from authMiddleware
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const profilePicPath = `/uploads/profilepics/${req.file.filename}`;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cleanup old profile pic if exists
    if (user.profilePic) {
      const oldPath = path.join(process.cwd(), user.profilePic.replace("/uploads", "uploads"));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePic = profilePicPath;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePic: profilePicPath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Failed to upload profile picture",
      error: error.message,
    });
  }
};

// Function for updating profile (username, bio, and optional profilePic)
const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Validate username uniqueness if changed
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(409).json({ message: 'Username already taken' });
    }

    // Update fields
    if (username) user.username = username;
    if (bio) user.bio = bio;

    // Handle profile picture update
    if (req.file) {
      const imagePath = `/uploads/profilepics/${req.file.filename}`;
      if (user.profilePic) {
        const oldPath = path.join(process.cwd(), user.profilePic.replace('/uploads', 'uploads'));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      user.profilePic = imagePath;
    }

    await user.save();
    res.status(200).json({
      message: 'Profile updated successfully!',
      username: user.username,
      bio: user.bio,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function for searching users
const searchUsers = async (req, res) => {
  try {
    const { username, includePosts } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const users = await User.find({
      username: new RegExp(username, "i"),
    }).select("_id username profilePic");

    const token = req.headers.authorization?.split(" ")[1];
    let usersWithFollowStatus = users;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUserId = decoded.id;
      const currentUser = await User.findById(currentUserId).select("following");
      usersWithFollowStatus = users.map((user) => ({
        ...user.toObject(),
        isFollowing: currentUser.following.includes(user._id),
      }));

      if (includePosts === "true") {
        const userIds = users.map((u) => u._id);
        const posts = await Post.find({ user: { $in: userIds } })
          .sort({ createdAt: -1 })
          .select("-__v");
        usersWithFollowStatus = usersWithFollowStatus.map((user) => ({
          ...user,
          posts: posts.filter((p) => p.user.toString() === user._id.toString()),
        }));
      }
    } else if (includePosts === "true") {
      const userIds = users.map((u) => u._id);
      const posts = await Post.find({ user: { $in: userIds } })
        .sort({ createdAt: -1 })
        .select("-__v");
      usersWithFollowStatus = users.map((user) => ({
        ...user.toObject(),
        posts: posts.filter((p) => p.user.toString() === user._id.toString()),
      }));
    }

    return res.json({ users: usersWithFollowStatus });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export { registerUser, loginUser, uploadProfilePic, searchUsers, updateProfile };