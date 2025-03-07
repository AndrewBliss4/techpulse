-- Create Field table
CREATE TABLE Field (
    field_id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    description TEXT,
    funding BIGINT
);

-- Insert default entry into Field table
--INSERT INTO Field (field_id, field_name, description, funding)
--VALUES (0, 'TEST', 'TEST', 0);

-- Create Insight table
CREATE TABLE Insight (
    insight_id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Feedback table
CREATE TABLE Feedback (
    feedback_id SERIAL PRIMARY KEY,
    insight_id INT REFERENCES Insight(insight_id) ON DELETE CASCADE,
    feedback_text TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create TIMEDMETRICS table with FLOAT metrics
CREATE TABLE TIMEDMETRICS (
    timed_metric_id SERIAL PRIMARY KEY,
    metric_1 FLOAT NOT NULL,
    metric_2 FLOAT NOT NULL,
    metric_3 FLOAT,
    metric_date TIMESTAMP NOT NULL, -- Changed from DATE to TIMESTAMP
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE,
    rationale TEXT,
    source TEXT
);

-- Create admin role with all privileges
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'admin'
    ) THEN
        CREATE ROLE admin WITH LOGIN PASSWORD 'admin';
        GRANT ALL PRIVILEGES ON DATABASE techpulse TO admin;
    END IF;
END $$;