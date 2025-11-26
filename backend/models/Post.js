import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: {
      type: String,
      required: [true, "Image is required"],
      match: [/^\/uploads\/posts\/.+$/, "Image path must start with /uploads/posts/"],
    },
    caption: { type: String, default: "" },
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Index for better query performance
postSchema.index({ user: 1, createdAt: -1 }); // Efficient sorting by user and creation date
// Add index on likes.user for efficient lookup of who liked a post
postSchema.index({ "likes.user": 1 });

// Virtual field to get the number of likes (for convenience in queries)
postSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

// Add a virtual to check if the current user liked the post (for frontend use)
postSchema.virtual("userLiked").get(function (userId) {
  if (!userId) return false;
  return this.likes.some(like => like.user.toString() === userId.toString());
});

// Ensure virtuals are included in toJSON and toObject outputs
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

export default mongoose.model("Post", postSchema);