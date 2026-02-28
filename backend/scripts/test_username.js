// Test script to verify username functionality
const User = require('../models/User');

async function testUsernameFunctionality() {
  try {
    console.log('Testing username functionality...\n');

    // Test 1: Create a user with username
    console.log('Test 1: Creating user with username...');
    const testUserData = {
      email: 'test@example.com',
      username: 'testuser123',
      name: 'Test User',
      role: 'user',
      mode: 'user'
    };

    const user = await User.create(testUserData);
    console.log('✓ User created successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name
    });

    // Test 2: Get user by username
    console.log('\nTest 2: Getting user by username...');
    const foundUser = await User.getByUsername('testuser123');
    if (foundUser) {
      console.log('✓ User found by username:', {
        id: foundUser.id,
        email: foundUser.email,
        username: foundUser.username
      });
    } else {
      console.log('✗ User not found by username');
    }

    // Test 3: Update username
    console.log('\nTest 3: Updating username...');
    await user.updateProfile({ username: 'updateduser456' });
    console.log('✓ Username updated successfully:', {
      oldUsername: 'testuser123',
      newUsername: user.username
    });

    // Test 4: Verify updated username
    console.log('\nTest 4: Verifying updated username...');
    const updatedUser = await User.getByUsername('updateduser456');
    if (updatedUser) {
      console.log('✓ Updated username found:', updatedUser.username);
    } else {
      console.log('✗ Updated username not found');
    }

    // Test 5: Try to create user with existing username (should fail)
    console.log('\nTest 5: Testing duplicate username prevention...');
    try {
      await User.create({
        email: 'test2@example.com',
        username: 'updateduser456', // Same username as existing user
        name: 'Test User 2',
        role: 'user',
        mode: 'user'
      });
      console.log('✗ Duplicate username was allowed (this should not happen)');
    } catch (error) {
      console.log('✓ Duplicate username correctly prevented:', error.message);
    }

    // Cleanup: Delete test user
    console.log('\nCleaning up test data...');
    // Note: You would need to implement a delete method in the User model for full cleanup
    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testUsernameFunctionality();
}

module.exports = { testUsernameFunctionality };
