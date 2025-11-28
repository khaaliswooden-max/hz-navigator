-- Email Preferences Table
-- Stores user email notification preferences

CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    
    -- Transactional emails (always on, but can be toggled off completely)
    transactional BOOLEAN DEFAULT TRUE,
    
    -- Compliance notifications
    compliance_alerts BOOLEAN DEFAULT TRUE,
    compliance_alert_frequency VARCHAR(20) DEFAULT 'immediate' CHECK (compliance_alert_frequency IN ('immediate', 'daily', 'weekly')),
    
    -- Marketing emails
    product_updates BOOLEAN DEFAULT TRUE,
    feature_announcements BOOLEAN DEFAULT TRUE,
    tips_and_best_practices BOOLEAN DEFAULT TRUE,
    
    -- Digest emails
    weekly_digest BOOLEAN DEFAULT TRUE,
    weekly_digest_day VARCHAR(10) DEFAULT 'monday' CHECK (weekly_digest_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    
    -- Global unsubscribe
    unsubscribed_all BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_weekly_digest ON email_preferences(weekly_digest, weekly_digest_day) WHERE weekly_digest = TRUE;

-- Email Logs Table
-- Track sent emails for analytics and debugging

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_address VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    template VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'complained')),
    message_id VARCHAR(255),
    error TEXT,
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON email_logs(message_id) WHERE message_id IS NOT NULL;

-- Email Unsubscribe Tokens Table
-- Store one-click unsubscribe tokens

CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires ON email_unsubscribe_tokens(expires_at) WHERE used_at IS NULL;

-- Trigger to update updated_at on email_preferences
CREATE OR REPLACE FUNCTION update_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER trigger_email_preferences_updated_at
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_preferences_updated_at();

-- Comments
COMMENT ON TABLE email_preferences IS 'Stores user email notification preferences';
COMMENT ON TABLE email_logs IS 'Audit log of all sent emails';
COMMENT ON TABLE email_unsubscribe_tokens IS 'One-click unsubscribe tokens for email links';

