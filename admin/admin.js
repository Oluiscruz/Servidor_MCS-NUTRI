const bcrypt = require('bcrypt');

async function gerarHashAdmin() {
    const senha = 'admin123';
    const hash = await bcrypt.hash(senha, 10);
    console.log('Hash gerado para senha "admin123":');
    console.log(hash);
    console.log('\nUse este comando SQL para criar o admin:');
    console.log(`INSERT INTO admins (email, senha) VALUES ('admin@nutrims.com', '${hash}');`);
}

gerarHashAdmin();
