-- Create Field Table
CREATE TABLE Field (
    field_id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Create Subfield Table
CREATE TABLE Subfield (
    subfield_id SERIAL PRIMARY KEY,
    field_id INT NOT NULL REFERENCES Field(field_id) ON DELETE CASCADE, -- Field reference, NOT NULL
    subfield_name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Create TimedMetrics Table
CREATE TABLE TimedMetrics (
    timed_metric_id SERIAL PRIMARY KEY,
    metric_1 FLOAT NOT NULL,
    metric_2 FLOAT NOT NULL,
    metric_3 FLOAT,
    metric_date TIMESTAMP NOT NULL,
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE, -- Field reference
    subfield_id INT REFERENCES Subfield(subfield_id) ON DELETE CASCADE, -- Subfield reference
    rationale TEXT,
    source TEXT,
    CHECK (
        (field_id IS NOT NULL AND subfield_id IS NULL) OR 
        (subfield_id IS NOT NULL AND field_id IS NULL)
    ) -- Ensures a TimedMetric entry belongs to either a Field or Subfield, not both
);

-- Create Insight Table
CREATE TABLE Insight (
    insight_id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Feedback Table
CREATE TABLE Feedback (
    feedback_id SERIAL PRIMARY KEY,
    insight_id INT REFERENCES Insight(insight_id) ON DELETE CASCADE,
    feedback_text TEXT,
    rating FLOAT CHECK (rating BETWEEN -1 AND +1), -- Rating now between -1 and +1
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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