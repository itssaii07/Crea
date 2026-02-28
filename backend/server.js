const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const passport = require("passport");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '../.env') });

const mongoose = require("mongoose");
const connectDB = require("./config/db");

// Connect to MongoDB
connectDB();

const authRoutes = require("./routes/authroutes");
const userRoutes = require("./routes/userroutes");
const requestRoutes = require("./routes/requestRoutes");
const chatRoutes = require("./routes/chatroutes");
const notificationRoutes = require("./routes/notificationsroutes");
const uploadRoutes = require("./routes/uploadRoutes");
const exploreRoutes = require("./routes/exploreroutes");
const activityRoutes = require("./routes/activityroutes");
// const backupRoutes = require("./routes/backupRoutes");
// const monitoringRoutes = require("./routes/monitoringRoutes");
// const optimizationRoutes = require("./routes/optimizationRoutes");
const homeRoutes = require("./routes/homeroutes");
const reviewRoutes = require("./routes/reviewRoutes");
const { createNotification } = require("./notifications");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(passport.initialize());

// Function to send notifications
async function sendNotification(userId, type, payload) {
  const notification = await createNotification(userId, type, payload);
}
app.set('sendNotification', sendNotification);

// Serve frontend folder
app.use(express.static(path.join(__dirname, "../frontend")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/activities", activityRoutes);
// app.use("/api/backup", backupRoutes);
// app.use("/api/monitoring", monitoringRoutes);
// app.use("/api/optimization", optimizationRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/reviews", reviewRoutes);

// Serve entry.html as default page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/entry.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});