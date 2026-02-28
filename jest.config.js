module.exports = {
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  testMatch: [
    "**/tests/**/*.test.js?(x)",
    "**/backend/**/*.js?(x)"
  ]
};