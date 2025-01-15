# TechPulse
AI-Powered Insight Generation Tool for RBC

### SCRAPER ###
First download Firefox for driver

# create venv using
pip install -r requirements
run main.py

### FRONT END ###
cd into /techpulse_app
npm i
npm start

### BACK END SERVER ###
cd into /techpulse_server
npm i
node server.js
make a file named .env with OpenAI Key

### PRISMA SETUP ###
cd into /techpulse_server

npm install prisma @prisma/client
npx prisma init

In .env folder change the database url to match your own
DATABASE_URL="postgresql://user:password@localhost:5432/your_database"

npx prisma db pull
npx prisma generate
