# Use an official Node.js runtime based on Alpine Linux
FROM node:16-alpine

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies (production mode)
RUN npm install --production

# Copy the rest of your app's code
COPY . .

# Expose the port defined in your .env (default: 8888)
EXPOSE ${PORT}

# Start your app (adjust if your entry point is different)
CMD [ "node", "index.js" ]