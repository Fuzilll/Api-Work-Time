const bcrypt = require('bcrypt');
const saltRounds = 10;

bcrypt.hash('12345678', saltRounds, (err, hash) => {
    console.log(hash); // Hash diferente a cada execução, mas todos válidos
});