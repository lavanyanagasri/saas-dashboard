FROM node:18

WORKDIR /app

# Copy shared package.json from root directory (.. = up one level)
COPY ../package*.json ./

RUN npm install

# Copy backend source code from server folder
COPY server/ .

EXPOSE 5000

CMD ["npm", "run", "dev"]

