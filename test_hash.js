const bcrypt = require('bcryptjs');
const hash = '$2b$10$Qnc/LVYjnCLCiuVMpKUHveT8EGlxIwAkF8lZ7C3KvDfhiQaHv3eCu';
const pw = 'password123';
console.log(bcrypt.compareSync(pw, hash));
