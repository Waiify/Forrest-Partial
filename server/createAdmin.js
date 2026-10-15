require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  const required = ['ADMIN_FIRSTNAME', 'ADMIN_LASTNAME', 'ADMIN_EMAIL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_CODE'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.log('Missing in .env:', missing.join(', '));
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('Users');

  

  if (await users.findOne({ role: 'admin' })) {
    console.log('An admin already exists. Nothing done.');
    return;
  }

  const now = new Date();
  await users.insertOne({
    firstName: process.env.ADMIN_FIRSTNAME,
    lastName: process.env.ADMIN_LASTNAME,
    email: process.env.ADMIN_EMAIL.toLowerCase(),
    username: process.env.ADMIN_USERNAME,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
    role: 'admin',
    adminCode: await bcrypt.hash(process.env.ADMIN_CODE, 10),
    createdAt: now,
    updatedAt: now,
  });

  console.log('Admin created. Now delete the ADMIN_ lines from .env.');
}

run().catch((err) => console.error(err)).finally(() => mongoose.disconnect());