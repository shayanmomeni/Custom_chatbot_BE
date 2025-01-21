const fs = require("fs");
const path = require("path");

const getUserImages = (userId) => {
  const folderPath = path.resolve(__dirname, "../resources/images", userId);
  const baseURL = `${process.env.BASE_URL || "http://localhost:8000"}/resources/images`;

  console.log(`[File Utils] Looking for images in folder: "${folderPath}"`);

  try {
    const files = fs.readdirSync(folderPath);
    console.log(`[File Utils] Found files: ${files.join(", ")}`);

    return files.map((file) => {
      const fullPath = `${baseURL}/${userId}/${file}`;
      console.log(`[File Utils] Prepared image URL: "${fullPath}"`);
      return fullPath;
    });
  } catch (error) {
    console.error(`[File Utils] Error fetching images for userId "${userId}":`, error.message);
    return [];
  }
};

module.exports = { getUserImages };