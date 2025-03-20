# TechPulse
AI-Powered Insight Generation Tool for RBC

### SCRAPER ###
First download Firefox for driver

# create venv using
pip install -r requirements
<br />
run main.py

### FRONT END ###
cd into /techpulse_app (cd .\techpulse\client\techpulse_app\)
<br />
npm i
<br />
npm start

### BACK END SERVER ###
cd into /techpulse_server (cd .\techpulse\server\techpulse_server\)
<br />
npm i
<br />
npm run server
<br />
make a file named .env with OpenAI Key

# DATABASE

get postgres and pgAdmin
in pgAdmin:
    make a user named: admin with pw: admin and run make a new database on port 5432
    name your new database: techpulse 
    copy and paste the schema in db\techpulse_db.sql\schema.sql to get all the tables and role permissions needed
    additionally, select admin under users in the pgAdmin tree and right click to view its properties and ensure that it has ALL permissions. 


# Additional Set-up:
Ensure that this directory exists:
techpulse\client\techpulse_app\src\components\Insights\MostRecentInsight.txt
it can be an empty text file to start, just ensure that the Insights folder and a text file with that name exists!