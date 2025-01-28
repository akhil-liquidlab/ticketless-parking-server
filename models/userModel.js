const bcrypt = require('bcrypt');

const users = [
    {
        id: 1,
        username: 'testuser',
        password: bcrypt.hashSync('password123', 10), // Hashed password
    },
];

module.exports = users;
