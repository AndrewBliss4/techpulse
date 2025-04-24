# TechPulse

AI-Powered Insight Generation Tool for RBC, leveraging OpenAI API and RAG. 

## SCRAPER

First download Firefox for driver
- Create venv using:
  ```
  pip install -r requirements
  ```
- Run main.py

## FRONT END

- cd into /techpulse_app:
  ```
  cd .\techpulse\client\techpulse_app\
  ```
- Install dependencies:
  ```
  npm i
  ```
- Start the application:
  ```
  npm start
  ```

## BACK END SERVER

- cd into /techpulse_server:
  ```
  cd .\techpulse\server\techpulse_server\
  ```
- Install dependencies:
  ```
  npm i
  ```
- Start the server:
  ```
  npm run server
  ```
- Make a file named .env with OpenAI Key

## DATABASE

- Get postgres and pgAdmin
- In pgAdmin:
  - Make a user named: admin with pw: admin and run make a new database on port 5432
  - Name your new database: techpulse
  - Copy and paste the schema in db\techpulse_db.sql\schema.sql to get all the tables and role permissions needed
  - Additionally, select admin under users in the pgAdmin tree and right click to view its properties and ensure that it has ALL permissions

## Additional Set-up

Ensure that this directory exists:
```
techpulse\client\techpulse_app\src\components\Insights\MostRecentInsight.txt
```
It can be an empty text file to start, just ensure that the Insights folder and a text file with that name exists!
