const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

const getUserImages = (userId) => {
  const folderPath = path.resolve(__dirname, "../resources/images", userId);
  console.log(`[Backend] Looking for images in folder: "${folderPath}"`);

  try {
    const files = fs.readdirSync(folderPath);
    console.log(`[Backend] Found files: ${files.join(", ")}`);
    // Return absolute URLs instead of relative paths
    return files.map((file) => `${BASE_URL}/resources/images/${userId}/${file}`);
  } catch (error) {
    console.error(`[Backend] Error fetching images for userId "${userId}":`, error.message);
    return [];
  }
};

module.exports = { getUserImages };