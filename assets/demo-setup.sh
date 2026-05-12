#!/bin/sh
rm -rf /tmp/agentdemo
mkdir -p /tmp/agentdemo/src
cd /tmp/agentdemo
git init -q

cat > src/app.js << 'EOF'
const express = require("express");
const auth = require("./auth");
const db = require("./db");

const app = express();
app.use("/api", auth.router);
app.listen(3000, () => console.log("Server running"));
EOF

cat > src/auth.js << 'EOF'
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

const verify = (token) => jwt.verify(token, SECRET);
const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: "7d" });

module.exports = { verify, sign, router: require("express").Router() };
EOF

cat > src/db.js << 'EOF'
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
EOF

cat > package.json << 'EOF'
{ "name": "my-app", "version": "1.0.0" }
EOF
