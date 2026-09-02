FROM node:alpine

# Create app directory
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml (if you have one)
COPY package*.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --ignore-scripts

# Bundle app source
COPY . .

# Expose port 8080
EXPOSE 8080

# Run the app
CMD [ "pnpm", "run", "dev" ]
