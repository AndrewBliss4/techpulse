const {Pool} = require('pg')
const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'techpulse',
  password: 'admin',
  port: 5432,
  user: "admin",
  password: "admin",
  database: "techpulse"
});


module.exports = pool