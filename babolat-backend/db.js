const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Password_123#',
    server: 'localhost',
    database: 'BabolatDB',
    port: 1434,

    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function connectDB() {
    try {

        await sql.connect(config);

        console.log('Kết nối SQL Server thành công!');

    } catch (err) {

        console.log('Lỗi kết nối database:');
        console.log(err);

    }
}

module.exports = {
    sql,
    connectDB
};