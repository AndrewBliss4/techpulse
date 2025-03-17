CREATE TABLE Field (
    field_id SERIAL PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE Subfield (
    subfield_id SERIAL PRIMARY KEY,
    field_id INT NOT NULL REFERENCES Field(field_id) ON DELETE CASCADE,
    subfield_name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE TimedMetrics (
    timed_metric_id SERIAL PRIMARY KEY,
    metric_1 FLOAT NOT NULL,
    metric_2 FLOAT NOT NULL,
    metric_3 FLOAT,
    metric_date TIMESTAMP NOT NULL,
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE,
    subfield_id INT REFERENCES Subfield(subfield_id) ON DELETE CASCADE,
    rationale TEXT,
    source TEXT
);

CREATE TABLE Insight (
    insight_id SERIAL PRIMARY KEY,
    field_id INT REFERENCES Field(field_id) ON DELETE CASCADE,
    insight_text TEXT NOT NULL,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Feedback (
    feedback_id SERIAL PRIMARY KEY,
    insight_id INT REFERENCES Insight(insight_id) ON DELETE CASCADE,
    feedback_text TEXT,
    rating FLOAT CHECK (rating BETWEEN -1 AND +1), -- Rating now between -1 and +1
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ModelParameters (
    parameter_id SERIAL PRIMARY KEY,
    modelUse VARCHAR,
    top_p FLOAT NOT NULL CHECK (top_p BETWEEN 0 AND 1),
    temperature FLOAT NOT NULL CHECK (temperature BETWEEN 0 AND 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM ModelParameters WHERE modelUse = 'NewFields'
    ) THEN
        INSERT INTO ModelParameters (modelUse, top_p, temperature)
        VALUES ('NewFields', 0.9, 0.7);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'admin'
    ) THEN
        CREATE ROLE admin WITH LOGIN PASSWORD 'admin';
        GRANT ALL PRIVILEGES ON DATABASE techpulse TO admin;
    END IF;
END $$;
INSERT INTO Field (field_id, field_name, description)  
VALUES (0, 'the current frontier of banking technology', NULL)  
ON CONFLICT (field_id) DO NOTHING;
/*UPDATE TimedMetrics tm
SET field_id = sf.field_id
FROM Subfield sf
WHERE tm.subfield_id IS NOT NULL
  AND tm.subfield_id = sf.subfield_id
  AND tm.field_id IS NULL;*/