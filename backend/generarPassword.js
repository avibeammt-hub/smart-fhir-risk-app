const bcrypt = require('bcrypt');

const generar = async () => {
  const password = '123456';
  const hash = await bcrypt.hash(password, 10);

  console.log('Password:', password);
  console.log('Hash:', hash);
};

generar();