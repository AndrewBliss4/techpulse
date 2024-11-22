const {Pool} = require('pg')
const pool = new pool ({
  host: 'db',
  port: 5432,
  user: "admin",
  password: "admin",
  database: "techpulse_db"
})

module.exports = pool