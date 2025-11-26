// utils/cleanupOldMoments.js
import Moment from "../models/Moment.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanupOldMoments = async () => {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const oldMoments = await Moment.find({
      createdAt: { $lt: twentyFourHoursAgo }
    });

    for (let moment of oldMoments) {
      // Delete image file
      if (moment.image) {
        const imagePath = path.join(__dirname, "..", moment.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      // Delete from DB
      await Moment.findByIdAndDelete(moment._id);
    }

    console.log(`Cleaned up ${oldMoments.length} expired moments`);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};

export default cleanupOldMoments;