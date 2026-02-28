# Crea - Creative Marketplace Platform

Crea is a full-stack web application designed as a creative marketplace platform connecting artists with customers. It provides a space for discovering art, requesting custom handmade creations, and collaborating through real-time communication.

## 🚀 Features

- **Authentication & Authorization**: Secure login and registration using JWT and Google OAuth20 integration.
- **User Profiles**: Manage personal profiles for both artists and customers.
- **Explore & Discovery**: Browse and discover various artworks and creative pieces.
- **Custom Requests**: Customers can create custom requests for artists.
- **Real-time Chat**: Integrated messaging system using Socket.io to allow fluid communication between users.
- **Notifications**: Automated notifications for updates on requests, messages, and activities.
- **File Uploads**: Secure image and file uploading using Multer.
- **Reviews & Ratings**: Leave reviews on completed orders or artist profiles.

## 🛠️ Tech Stack

**Frontend**:
- Vanilla HTML5 / CSS3 / JavaScript
- Responsive Design

**Backend**:
- [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) ODM
- [Socket.io](https://socket.io/) for WebSockets functionality
- [Passport.js](http://www.passportjs.org/) for authentication

**Testing**:
- [Jest](https://jestjs.io/) & [Supertest](https://github.com/visionmedia/supertest) for backend testing
- [Playwright](https://playwright.dev/) for end-to-end testing

## 📁 Project Structure

```
Crea/
├── backend/
│   ├── config/         # Database and third-party configurations
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom Express middlewares (auth, upload etc.)
│   ├── models/         # Mongoose schemas (User, Request, Chat, etc.)
│   ├── routes/         # Express API routes
│   └── server.js       # Entry point for the backend server
├── frontend/
│   ├── assets/         # Static assets like images
│   ├── js/             # Frontend JavaScript logic
│   └── *.html          # HTML Views (home, explore, chatbox, etc.)
└── package.json        # Project metadata and dependencies
```

## ⚙️ Prerequisites

Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/download/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas URI)

## 💻 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itssaii07/Crea.git
   cd Crea
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add the following configuration:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   ```

4. **Run the application**:
   - For development mode (uses `nodemon`):
     ```bash
     npm run dev
     ```
   - For production mode:
     ```bash
     npm start
     ```

   The server will run on `http://localhost:3000`.

## 🧪 Testing

To run the automated test suite (Jest and Playwright):

```bash
npm test
```
