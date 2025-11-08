const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: 'cmhpves940000aviwpslfn5hr',
  email: 'placeholder@example.com',
  role: 'SUPERUSER'
}, 'your-secret-key-here-change-in-production', { expiresIn: '1h' });
console.log(token);
