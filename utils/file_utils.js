const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";

/**
 * getUserImages
 * Original function returning just a list of image URLs (strings).
 */
function getUserImages(userId) {
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
}

/**
 * getUserAspectsAndImages
 * Returns an array of objects like:
 * [
 *   { aspectName: "laziness", imageUrl: "http://localhost:8000/resources/images/<userId>/laziness.jpeg" },
 *   { aspectName: "confidence", imageUrl: "http://localhost:8000/resources/images/<userId>/confidence.jpeg" },
 *   ...
 * ]
 */
function getUserAspectsAndImages(userId) {
  const folderPath = path.resolve(__dirname, "../resources/images", userId);
  console.log(`[Backend] Looking for aspect images in folder: "${folderPath}"`);

  try {
    const files = fs.readdirSync(folderPath);
    console.log(`[Backend] Found aspect files: ${files.join(", ")}`);

    // Parse each file to extract aspect name from the filename (without extension)
    return files.map((file) => {
      const aspectName = path.basename(file, path.extname(file)); 
      // e.g. "laziness.jpeg" => "laziness"

      const imageUrl = `${BASE_URL}/resources/images/${userId}/${file}`;
      return { aspectName, imageUrl };
    });
  } catch (error) {
    console.error(`[Backend] Error fetching aspect images for userId "${userId}":`, error.message);
    return [];
  }
}

module.exports = {
  getUserImages,
  getUserAspectsAndImages
};
