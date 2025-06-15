-- Create the queries table
CREATE TABLE IF NOT EXISTS queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    callSid TEXT NOT NULL,
    phone TEXT NOT NULL,
    step INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
    details JSONB NOT NULL DEFAULT '{}',
    message TEXT,
    submittedAt TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completedAt TIMESTAMP WITH TIME ZONE
);

-- Create the service_requirements table
CREATE TABLE IF NOT EXISTS service_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    fields JSONB NOT NULL DEFAULT '[]',
    docs JSONB NOT NULL DEFAULT '[]',
    fees JSONB NOT NULL DEFAULT '[]',
    eligibility JSONB NOT NULL DEFAULT '[]',
    processingTime TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queries_callSid ON queries(callSid);
CREATE INDEX IF NOT EXISTS idx_queries_phone ON queries(phone);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_createdAt ON queries(createdAt);
CREATE INDEX IF NOT EXISTS idx_service_requirements_name ON service_requirements(name);

-- Create RLS policies
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requirements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to queries
CREATE POLICY IF NOT EXISTS "Allow public read access to queries"
    ON queries FOR SELECT
    USING (true);

-- Allow authenticated users to insert queries
CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert queries"
    ON queries FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their own queries
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update queries"
    ON queries FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow public read access to service requirements
CREATE POLICY IF NOT EXISTS "Allow public read access to service requirements"
    ON service_requirements FOR SELECT
    USING (true);

-- Allow authenticated users to manage service requirements
CREATE POLICY IF NOT EXISTS "Allow authenticated users to manage service requirements"
    ON service_requirements FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Create a function to automatically update completedAt
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
        NEW.completedAt = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER IF NOT EXISTS set_completed_at
    BEFORE UPDATE ON queries
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();

-- Create a function to automatically update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updatedAt timestamp
CREATE TRIGGER IF NOT EXISTS set_updated_at
    BEFORE UPDATE ON service_requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Insert a row into service_requirements
INSERT INTO service_requirements (name, fields, docs, fees, eligibility, processingTime)
VALUES (
  'general-inquiry',
  '[]',
  '[]',
  '[]',
  '[]',
  'Usually processed within a few days'
); 