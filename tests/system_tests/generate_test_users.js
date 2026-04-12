const { faker } = require('@faker-js/faker');
const fs = require('fs');
const bcrypt = require('bcrypt');

const PLAIN_PASSWORD = "password123"; 
const SALT_ROUNDS = 10;

const generateUsers = async (count) => {
  const users = [];
  const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, SALT_ROUNDS);

  for (let i = 0; i < count; i++) {
    users.push({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: hashedPassword, 
      phone: "1234567890",
      address: `${faker.location.streetAddress()}, Singapore`,
      answer: "Basketball",
      role: 0,
    });
  }
  return users;
};

generateUsers(1000).then(userData => {
  fs.writeFileSync('users.json', JSON.stringify(userData, null, 2));
  console.log('Generated 1000 users');
});