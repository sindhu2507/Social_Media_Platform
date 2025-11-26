import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Moment from "../models/Moment.js"; // Ensure this is correctly imported
import { validateEmail, validatePhone } from "../utils/validators.js";
import authMiddleware from "../utils/authMiddleware.js";
import { searchUsers, updateProfile } from "../controllers/authController.js";
import { fileURLToPath } from "url";

const router = express.Router();


// Multer setup
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profilepics";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const postPicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/posts";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const momentPicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/moments";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

const uploadProfilePic = multer({ storage: profilePicStorage });
const uploadPostPic = multer({ storage: postPicStorage });
const uploadMomentPic = multer({ storage: momentPicStorage });

// Signup Route
router.post("/signup", async (req, res) => {
  const { email, firstName, lastName, dob, phone, username, password, confirmPassword, gender } = req.body;

  if (!email || !firstName || !lastName || !dob || !phone || !username || !password || !confirmPassword || !gender)
    return res.status(400).json({ message: "All fields are required" });

  if (!validateEmail(email)) return res.status(400).json({ message: "Invalid email format" });
  if (!validatePhone(phone)) return res.status(400).json({ message: "Invalid phone number" });
  if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match" });

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(409).json({ message: "Email or username already registered" });

    const user = new User({
      email,
      firstName,
      lastName,
      dob,
      phone,
      username,
      password, // Plain text
      gender,
      plainText: true,
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(201).json({ message: "User registered successfully!", token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) return res.status(400).json({ message: "All fields are required" });

  try {
    const user = await User.findOne({ $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }] });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    let isMatch;
    if (user.plainText) {
      isMatch = password === user.password;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const { password: _, ...userData } = user._doc;
    res.status(200).json({ message: "Login successful", token, expiresIn: 3600, user: userData });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Upload Profile Picture
router.post("/upload-profile-pic", authMiddleware, uploadProfilePic.single("profilePic"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const imagePath = `/uploads/profilepics/${req.file.filename}`;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.profilePic) {
      const oldPath = path.join(process.cwd(), user.profilePic.replace("/uploads", "uploads"));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePic = imagePath;
    await user.save();
    res.status(200).json({ message: "Profile picture uploaded successfully!", profilePic: imagePath });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update Profile
router.put("/update-profile", authMiddleware, uploadProfilePic.single("profilePic"), updateProfile);

// Get User Info and Posts by User ID (or current user if no userId)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const queryUserId = req.query.userId;
    const authUserId = req.user._id;
    const userId = queryUserId || authUserId;
    const user = await User.findById(userId)
      .select("-password -__v")
      .populate("following", "username profilePic")
      .populate("followers", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();
    const postsWithLikes = posts.map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      userLiked: post.likes ? post.likes.some(like => like.user.toString() === authUserId.toString()) : false,
    }));
    res.status(200).json({ ...user.toObject(), posts: postsWithLikes });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create a Post
router.post("/create-post", authMiddleware, uploadPostPic.single("postImage"), async (req, res) => {
  try {
    const { caption } = req.body;
    if (!req.file) return res.status(400).json({ message: "Post image is required" });

    const newPost = new Post({
      user: req.user._id,
      caption: caption || "",
      image: `/uploads/posts/${req.file.filename}`,
      likes: [],
    });
    await newPost.save();
    res.status(201).json({ message: "Post created!", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a Post
router.delete("/delete-post/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized to delete this post" });

    const imagePath = path.join(process.cwd(), post.image);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    await post.deleteOne();
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Like/Unlike a Post
router.post("/like-post/:postId", authMiddleware, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;
    let post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found" });

    const userLikedIndex = post.likes.findIndex(like => like.user.toString() === userId.toString());
    let updatedLikes;

    if (userLikedIndex === -1) {
      post.likes.push({ user: userId, createdAt: new Date() });
      updatedLikes = post.likes.length;
    } else {
      post.likes.splice(userLikedIndex, 1);
      updatedLikes = post.likes.length;
    }

    await post.save();

    post = await Post.findById(postId).lean();
    const likesCount = post.likes.length;
    const isUserLiked = post.likes.some(like => like.user.toString() === userId.toString());

    res.status(200).json({
      message: userLikedIndex === -1 ? "Post liked" : "Post unliked",
      likes: likesCount,
      userLiked: isUserLiked,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Follow/Unfollow a User
router.post("/follow", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id; // This is ObjectId

    if (!userId) return res.status(400).json({ msg: "User ID required" });
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ msg: "Cannot follow yourself" });
    }

    // Fetch both users in parallel
    const [currentUser, userToFollow] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId)
    ]);

    if (!userToFollow) return res.status(404).json({ msg: "User not found" });
    if (!currentUser) return res.status(404).json({ msg: "Current user not found" });

    // Convert everything to string for safe comparison
    const currentUserStr = currentUserId.toString();
    const targetUserStr = userId.toString();

    const isCurrentlyFollowing = currentUser.following
      .map(id => id.toString())
      .includes(targetUserStr);

    if (isCurrentlyFollowing) {
      // UNFOLLOW — REMOVE FROM BOTH SIDES
      currentUser.following.pull(targetUserStr);        // This is the magic line
      userToFollow.followers.pull(currentUserStr);      // This actually removes you!

      await Promise.all([currentUser.save(), userToFollow.save()]);

      return res.json({ isFollowing: false, message: "Unfollowed" });
    } else {
      // FOLLOW
      currentUser.following.addToSet(targetUserStr);    // Prevents duplicates
      userToFollow.followers.addToSet(currentUserStr);  // Prevents duplicates

      await Promise.all([currentUser.save(), userToFollow.save()]);

      return res.json({ isFollowing: true, message: "Followed" });
    }

  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});
// Get Posts from Following Users
router.get("/posts/following", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("following", "_id");
    const followingIds = user.following.map(f => f._id);
    if (followingIds.length === 0) {
      return res.status(200).json({ message: "No users followed yet.", posts: [] });
    }
    const posts = await Post.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .populate("user", "username profilePic")
      .select("-__v")
      .lean();
    const postsWithDetails = posts.map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      userLiked: post.likes ? post.likes.some(like => like.user.toString() === req.user._id.toString()) : false,
    }));
    res.status(200).json(postsWithDetails);
  } catch (error) {
    res.status(500).json({ message: "Failed to load posts. Please try again later." });
  }
});

router.get("/following", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("following", "username profilePic _id")
      .select("following");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Following users fetched successfully",
      following: user.following,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get User Suggestions (Unfollowed Users)
router.get("/suggestions", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("following");
    const followingIds = currentUser.following.map(f => f.toString());

    const allUsers = await User.find({
      _id: { $ne: req.user._id, $nin: followingIds },
    }).select("username profilePic _id").limit(5);

    if (!allUsers.length) {
      return res.status(200).json({ message: "No suggestions available.", users: [] });
    }

    res.status(200).json(allUsers);
  } catch (error) {
    res.status(500).json({ message: "Failed to load suggestions. Please try again later." });
  }
});

// Create a Moment
router.post("/create-moment", authMiddleware, uploadMomentPic.single("momentImage"), async (req, res) => {
  try {
    const { caption } = req.body;
    if (!req.file) return res.status(400).json({ message: "Moment image is required" });

    const newMoment = new Moment({
      user: req.user._id,
      image: `/uploads/moments/${req.file.filename}`,
      caption: caption || "",
    });
    await newMoment.save();
    res.status(201).json({ message: "Moment created!", moment: newMoment });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// ──────────────────────────────────────────────────────────────
// NEW ENDPOINT: Get only following users who have uploaded a moment
// Route: GET /api/auth/following-with-moments
// ──────────────────────────────────────────────────────────────
// GET /api/auth/following-with-moments
router.get("/following-with-moments", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Step 1: Get all users I follow (as ObjectId)
    const currentUser = await User.findById(userId).select("following");
    const followingIds = currentUser?.following || [];

    // Step 2: Include MYSELF too (very important!)
    const allUserIds = [userId, ...followingIds];

    // Step 3: Find which of these users have at least one moment
    const moments = await Moment.find({
      user: { $in: allUserIds }
    })
      .select("user")
      .lean();

    // Extract unique user IDs who have moments
    const userIdsWithMoments = [...new Set(moments.map(m => m.user.toString()))];

    // Step 4: If no one has moments, return empty
    if (userIdsWithMoments.length === 0) {
      return res.json({ followingWithMoments: [] });
    }

    // Step 5: Get full user details (username + profilePic)
    const usersWithMoments = await User.find({
      _id: { $in: userIdsWithMoments }
    })
      .select("username profilePic _id")
      .lean();

    // Optional: Sort so that current user appears first (like Instagram)
    const sortedUsers = usersWithMoments.sort((a, b) => {
      if (a._id.toString() === userId.toString()) return -1;
      if (b._id.toString() === userId.toString()) return 1;
      return 0;
    });

    res.json({ followingWithMoments: sortedUsers });

  } catch (err) {
    console.error("Error in /following-with-moments:", err);
    res.status(500).json({ followingWithMoments: [] });
  }
});
// DELETE A MOMENT (STORY)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your delete route
router.delete("/delete-moment/:momentId", authMiddleware, async (req, res) => {
  try {
    const momentId = req.params.momentId;
    const userId = req.user._id.toString();

    const moment = await Moment.findById(momentId);
    if (!moment) return res.status(404).json({ message: "Moment not found" });

    if (moment.user.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // DELETE IMAGE — NOW WORKS IN ESM
    if (moment.image) {
      const imagePath = path.join(__dirname, "..", moment.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("Deleted image:", imagePath);
      }
    }

    await Moment.findByIdAndDelete(momentId);
    res.json({ message: "Moment deleted successfully" });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Moments by User ID
// GET MOMENTS — ONLY LAST 24 HOURS
router.get("/moments/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const moments = await Moment.find({
      user: userId,
      createdAt: { $gte: twentyFourHoursAgo } // Only moments from last 24h
    })
    .sort({ createdAt: -1 })
    .select("image caption createdAt");

    res.json(moments);
  } catch (err) {
    console.error("Error fetching moments:", err);
    res.status(500).json({ message: "Server error" });
  }
});
// Suggested Users Route
// Replace this entire route in your authRoutes.js
// GET /api/auth/suggested-users → Instagram-style "People you may know"
router.get("/suggested-users", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();

    // Step 1: Get who I follow
    const currentUser = await User.findById(req.user._id).select("following");
    const followingIds = currentUser.following.map(id => id.toString());

    // If I follow no one → no suggestions
    if (followingIds.length === 0) {
      return res.json({ suggestedUsers: [] });
    }

    // Step 2: Find users followed by people I follow (but I don't follow)
    const suggestions = await User.aggregate([
      // Exclude: myself + people I already follow
      {
        $match: {
          _id: {
            $nin: [
              req.user._id, // myself
              ...currentUser.following // people I follow
            ]
          }
        }
      },
      // Find who follows this user (i.e., their followers)
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "following",
          as: "followedBy"
        }
      },
      // Keep only if at least one of my following follows them
      {
        $match: {
          "followedBy._id": { $in: currentUser.following }
        }
      },
      // Count mutual connections
      {
        $addFields: {
          mutualCount: {
            $size: {
              $setIntersection: [
                "$followedBy._id",
                currentUser.following
              ]
            }
          }
        }
      },
      // Sort by relevance
      { $sort: { mutualCount: -1 } },
      { $limit: 10 },
      // Clean output
      {
        $project: {
          username: 1,
          profilePic: 1,
          mutualCount: 1
        }
      }
    ]);

    // Format for frontend
    const formattedSuggestions = suggestions.map(user => ({
      _id: user._id.toString(),
      username: user.username,
      profilePic: user.profilePic,
      isFollowing: false,
      mutualText: user.mutualCount > 1
        ? `Followed by ${user.mutualCount} people you follow`
        : user.mutualCount === 1
        ? "Followed by 1 person you follow"
        : "Suggested for you"
    }));

    res.json({ suggestedUsers: formattedSuggestions });
  } catch (err) {
    console.error("Suggested users error:", err);
    res.status(500).json({ suggestedUsers: [] });
  }
});

// Search Users
router.get("/search-users", (req, res, next) => {
  searchUsers(req, res, next);
}, (err, req, res, next) => {
  res.status(500).json({ message: "Internal server error" });
});

export default router;