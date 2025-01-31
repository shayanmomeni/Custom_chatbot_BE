const fs = require("fs");
const path = require("path");

const getUserImages = (userId) => {
  const folderPath = path.resolve(__dirname, "../resources/images", userId);
  try {
    const files = fs.readdirSync(folderPath);
    return files.map((file) => `/resources/images/${userId}/${file}`);
  } catch (error) {
    return [];
  }
};

module.exports = { getUserImages };