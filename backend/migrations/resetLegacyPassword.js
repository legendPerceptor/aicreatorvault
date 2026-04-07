/**
 * Reset Legacy User Password
 *
 * Usage:
 *   node backend/migrations/resetLegacyPassword.js [password]
 *
 * If no password is provided, defaults to 'legacy123'
 */

require('dotenv').config({ path: __dirname + '/../../.env' });
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function resetPassword() {
  const password = process.argv[2] || 'legacy123';

  console.log(`Resetting password for legacy@local user...`);
  console.log(`New password: ${password}`);

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected.');

    // Find the legacy user
    const legacyUser = await User.findOne({ where: { email: 'legacy@local' } });

    if (!legacyUser) {
      console.error('Error: legacy@local user not found!');
      process.exit(1);
    }

    console.log(`Found user: ${legacyUser.username} (id: ${legacyUser.id})`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the user's password
    await legacyUser.update({ password_hash: passwordHash });

    console.log(`Password updated successfully!`);
    console.log(`You can now login with: legacy@local / ${password}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

resetPassword();
