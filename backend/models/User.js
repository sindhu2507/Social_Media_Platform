import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please provide a valid email address"],
    },
    firstName: {
      type: String,
      required: [true, "First Name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last Name is required"],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, "Date of Birth is required"],
      validate: {
        validator: function (value) {
          const today = new Date();
          const age = today.getFullYear() - value.getFullYear();
          return age >= 18;
        },
        message: "You must be at least 18 years old",
      },
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: ["male", "female", "other"],
    },
    profilePic: {
      type: String,
      default: null, // Changed from "" to null for clarity
      match: [/^\/uploads\/profilepics\/.+$/, "Invalid profile picture path"], // Optional validation
    },
    bio: {
      type: String,
      default: "bio...", // Changed from "" to null for clarity

    },
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Middleware to hash password before saving with error handling
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    return next(error); // Pass error to Mongoose error handling
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT
userSchema.methods.generateAuthToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Combine email and username into a compound index
userSchema.index({ email: 1, username: 1 });

// Index for following and followers for faster queries
userSchema.index({ following: 1 });
userSchema.index({ followers: 1 });

// Virtual field for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in toJSON output (e.g., for API responses)
userSchema.set("toJSON", { virtuals: true });

export default mongoose.model("User", userSchema);