# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define the command to run your app
CMD ["node", "index.js"]
