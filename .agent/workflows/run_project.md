---
description: How to run the Crea project locally
---

1. **Prerequisites**
   - **Node.js** installed.
   - **MongoDB Community Server** installed and running.
     - Windows: Check Services for "MongoDB Server".
     - Mac/Linux: Run `mongod`.

2. **Install Dependencies**
   Run the following command to install all necessary packages for both frontend and backend:
   ```bash
   npm install
   ```

3. **Configure Environment**
   Ensure you have a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/crea
   JWT_SECRET=your_secret_key
   ```

4. **Start the Server**
   To start the backend server (which also serves the frontend):
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   ```

5. **Access the Application**
   Open your web browser and navigate to:
   [http://localhost:3000](http://localhost:3000)

6. **Verify Database (MongoDB Compass)**
   - Open MongoDB Compass.
   - Connect to `mongodb://localhost:27017`.
   - Once you create a user in the app, look for the `crea` database.
