-- Create tracking table for OTPs
CREATE TABLE IF NOT EXISTS otps (
    mobile TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
