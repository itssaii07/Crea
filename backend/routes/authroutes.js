const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this googleId
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update last login
        user.lastLoginAt = Date.now();
        await user.save();
        return done(null, user);
      }

      // Check if user exists with this email (link accounts)
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.authProvider = 'google';
        user.lastLoginAt = Date.now();
        if (!user.profilePicUrl && profile.photos && profile.photos[0]) {
          user.profilePicUrl = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }

      // Create new user
      const username = profile.emails[0].value.split('@')[0] + '_' + Date.now().toString(36);
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        username: username,
        name: profile.displayName || '',
        profilePicUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
        authProvider: 'google'
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Initialize passport (no session needed for JWT-based auth)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check username
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      name: name || ''
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error', details: err.message });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLoginAt = Date.now();
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const userData = user.toJSON();
    userData.id = user._id.toString(); // Ensure id is available as string
    res.json(userData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
router.put("/updatedetails", auth, async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      username: req.body.username,
      bio: req.body.bio,
      links: req.body.links,
      profilePicUrl: req.body.profilePicUrl
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
router.put("/updatepassword", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @desc    Update user role
// @route   PATCH /api/auth/role
// @access  Private
router.patch("/role", auth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'artist'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }

    // Update role
    const user = await User.findByIdAndUpdate(req.user.id, { role }, { new: true });

    res.json({ role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update_failed' });
  }
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    // .cookie('token', token, options) // Optional: Use cookies
    .json({
      success: true,
      token,
      user: user.toPublicJSON()
    });
};

// @desc    Google OAuth - Initiate
// @route   GET /api/auth/google
// @access  Public
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false
}));

// @desc    Google OAuth - Callback
// @route   GET /api/auth/google/callback
// @access  Public
router.get("/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth.html?error=google_auth_failed",
    session: false
  }),
  (req, res) => {
    // Generate JWT token for the authenticated user
    const token = req.user.getSignedJwtToken();

    // Redirect to frontend with token in URL
    // Frontend will extract and store the token
    res.redirect(`/auth.html?token=${token}&provider=google`);
  }
);

module.exports = router;