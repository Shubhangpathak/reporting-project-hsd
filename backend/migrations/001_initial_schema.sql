CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_org_id TEXT NOT NULL UNIQUE,
    auth_org_name TEXT NOT NULL,
    credit_threshold SMALLINT NOT NULL DEFAULT 600,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'client'
        CHECK (role IN ('platform_admin', 'client')),
    status TEXT NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL
        CHECK (provider IN ('google_ads', 'meta_ads', 'ghl')),
    external_account_id TEXT NOT NULL,
    external_account_name TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'connected'
        CHECK (status IN ('connected', 'expired', 'error', 'disconnected')),
    last_synced_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, provider, external_account_id),
    CONSTRAINT integration_connections_identity_unique
        UNIQUE (id, organization_id, provider)
);

CREATE TABLE IF NOT EXISTS google_ads_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL
        REFERENCES integration_connections(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google_ads'
        CHECK (provider = 'google_ads'),
    metric_date DATE NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    campaign_status TEXT,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    spend_micros BIGINT NOT NULL DEFAULT 0,
    conversions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    conversion_value_micros BIGINT NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, campaign_id, metric_date),
    CONSTRAINT google_ads_daily_connection_identity_fkey
        FOREIGN KEY (connection_id, organization_id, provider)
        REFERENCES integration_connections (id, organization_id, provider)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta_ads_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL
        REFERENCES integration_connections(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'meta_ads'
        CHECK (provider = 'meta_ads'),
    metric_date DATE NOT NULL,
    campaign_id TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    campaign_status TEXT,
    objective TEXT,
    impressions BIGINT NOT NULL DEFAULT 0,
    reach BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    link_clicks BIGINT NOT NULL DEFAULT 0,
    spend_micros BIGINT NOT NULL DEFAULT 0,
    platform_leads NUMERIC(12, 2) NOT NULL DEFAULT 0,
    platform_conversions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, campaign_id, metric_date),
    CONSTRAINT meta_ads_daily_connection_identity_fkey
        FOREIGN KEY (connection_id, organization_id, provider)
        REFERENCES integration_connections (id, organization_id, provider)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ghl_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL
        REFERENCES integration_connections(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'ghl'
        CHECK (provider = 'ghl'),
    ghl_contact_id TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    email TEXT,
    business_name TEXT,
    source TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    credit_band TEXT,
    credit_score_min SMALLINT,
    credit_score_max SMALLINT,
    budget_band TEXT,
    treatment_need TEXT,
    location_name TEXT,
    replied BOOLEAN NOT NULL DEFAULT FALSE,
    is_test_lead BOOLEAN NOT NULL DEFAULT FALSE,
    is_qualified BOOLEAN,
    qualification_reason TEXT,
    ghl_created_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    raw_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (connection_id, ghl_contact_id),
    CONSTRAINT ghl_contacts_connection_identity_fkey
        FOREIGN KEY (connection_id, organization_id, provider)
        REFERENCES integration_connections (id, organization_id, provider)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL
        REFERENCES integration_connections(id) ON DELETE CASCADE,
    provider TEXT NOT NULL
        CHECK (provider IN ('google_ads', 'meta_ads', 'ghl')),
    status TEXT NOT NULL
        CHECK (status IN ('running', 'completed', 'failed')),
    date_from DATE,
    date_to DATE,
    records_processed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT sync_runs_connection_identity_fkey
        FOREIGN KEY (connection_id, organization_id, provider)
        REFERENCES integration_connections (id, organization_id, provider)
        ON DELETE CASCADE
);

ALTER TABLE google_ads_daily
    ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE meta_ads_daily
    ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE ghl_contacts
    ADD COLUMN IF NOT EXISTS provider TEXT;

ALTER TABLE google_ads_daily
    ALTER COLUMN provider SET DEFAULT 'google_ads';
ALTER TABLE meta_ads_daily
    ALTER COLUMN provider SET DEFAULT 'meta_ads';
ALTER TABLE ghl_contacts
    ALTER COLUMN provider SET DEFAULT 'ghl';

UPDATE google_ads_daily
SET provider = 'google_ads'
WHERE provider IS NULL;

UPDATE meta_ads_daily
SET provider = 'meta_ads'
WHERE provider IS NULL;

UPDATE ghl_contacts
SET provider = 'ghl'
WHERE provider IS NULL;

DO $$
DECLARE
    invalid_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO invalid_count
    FROM google_ads_daily AS child
    LEFT JOIN integration_connections AS connection
        ON connection.id = child.connection_id
    WHERE child.provider IS DISTINCT FROM 'google_ads'
       OR connection.id IS NULL
       OR connection.organization_id IS DISTINCT FROM child.organization_id
       OR connection.provider IS DISTINCT FROM child.provider;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'google_ads_daily has % invalid row(s): missing connection, organization mismatch, or provider mismatch',
            invalid_count;
    END IF;

    SELECT COUNT(*)
    INTO invalid_count
    FROM meta_ads_daily AS child
    LEFT JOIN integration_connections AS connection
        ON connection.id = child.connection_id
    WHERE child.provider IS DISTINCT FROM 'meta_ads'
       OR connection.id IS NULL
       OR connection.organization_id IS DISTINCT FROM child.organization_id
       OR connection.provider IS DISTINCT FROM child.provider;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'meta_ads_daily has % invalid row(s): missing connection, organization mismatch, or provider mismatch',
            invalid_count;
    END IF;

    SELECT COUNT(*)
    INTO invalid_count
    FROM ghl_contacts AS child
    LEFT JOIN integration_connections AS connection
        ON connection.id = child.connection_id
    WHERE child.provider IS DISTINCT FROM 'ghl'
       OR connection.id IS NULL
       OR connection.organization_id IS DISTINCT FROM child.organization_id
       OR connection.provider IS DISTINCT FROM child.provider;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'ghl_contacts has % invalid row(s): missing connection, organization mismatch, or provider mismatch',
            invalid_count;
    END IF;

    SELECT COUNT(*)
    INTO invalid_count
    FROM sync_runs AS child
    LEFT JOIN integration_connections AS connection
        ON connection.id = child.connection_id
    WHERE child.provider NOT IN ('google_ads', 'meta_ads', 'ghl')
       OR connection.id IS NULL
       OR connection.organization_id IS DISTINCT FROM child.organization_id
       OR connection.provider IS DISTINCT FROM child.provider;

    IF invalid_count > 0 THEN
        RAISE EXCEPTION
            'sync_runs has % invalid row(s): missing connection, organization mismatch, or provider mismatch',
            invalid_count;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'google_ads_daily'
          AND column_name = 'provider'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE google_ads_daily
            ALTER COLUMN provider SET NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'meta_ads_daily'
          AND column_name = 'provider'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE meta_ads_daily
            ALTER COLUMN provider SET NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ghl_contacts'
          AND column_name = 'provider'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE ghl_contacts
            ALTER COLUMN provider SET NOT NULL;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'integration_connections'::regclass
          AND conname = 'integration_connections_identity_unique'
    ) THEN
        ALTER TABLE integration_connections
            ADD CONSTRAINT integration_connections_identity_unique
            UNIQUE (id, organization_id, provider);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'google_ads_daily'::regclass
          AND conname = 'google_ads_daily_provider_check'
    ) THEN
        ALTER TABLE google_ads_daily
            ADD CONSTRAINT google_ads_daily_provider_check
            CHECK (provider = 'google_ads');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'meta_ads_daily'::regclass
          AND conname = 'meta_ads_daily_provider_check'
    ) THEN
        ALTER TABLE meta_ads_daily
            ADD CONSTRAINT meta_ads_daily_provider_check
            CHECK (provider = 'meta_ads');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'ghl_contacts'::regclass
          AND conname = 'ghl_contacts_provider_check'
    ) THEN
        ALTER TABLE ghl_contacts
            ADD CONSTRAINT ghl_contacts_provider_check
            CHECK (provider = 'ghl');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'sync_runs'::regclass
          AND conname = 'sync_runs_provider_check'
    ) THEN
        ALTER TABLE sync_runs
            ADD CONSTRAINT sync_runs_provider_check
            CHECK (provider IN ('google_ads', 'meta_ads', 'ghl'));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'google_ads_daily'::regclass
          AND conname = 'google_ads_daily_connection_identity_fkey'
    ) THEN
        ALTER TABLE google_ads_daily
            ADD CONSTRAINT google_ads_daily_connection_identity_fkey
            FOREIGN KEY (connection_id, organization_id, provider)
            REFERENCES integration_connections (id, organization_id, provider)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'meta_ads_daily'::regclass
          AND conname = 'meta_ads_daily_connection_identity_fkey'
    ) THEN
        ALTER TABLE meta_ads_daily
            ADD CONSTRAINT meta_ads_daily_connection_identity_fkey
            FOREIGN KEY (connection_id, organization_id, provider)
            REFERENCES integration_connections (id, organization_id, provider)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'ghl_contacts'::regclass
          AND conname = 'ghl_contacts_connection_identity_fkey'
    ) THEN
        ALTER TABLE ghl_contacts
            ADD CONSTRAINT ghl_contacts_connection_identity_fkey
            FOREIGN KEY (connection_id, organization_id, provider)
            REFERENCES integration_connections (id, organization_id, provider)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'sync_runs'::regclass
          AND conname = 'sync_runs_connection_identity_fkey'
    ) THEN
        ALTER TABLE sync_runs
            ADD CONSTRAINT sync_runs_connection_identity_fkey
            FOREIGN KEY (connection_id, organization_id, provider)
            REFERENCES integration_connections (id, organization_id, provider)
            ON DELETE CASCADE;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS google_ads_org_date_idx
    ON google_ads_daily (organization_id, metric_date);
CREATE INDEX IF NOT EXISTS meta_ads_org_date_idx
    ON meta_ads_daily (organization_id, metric_date);
CREATE INDEX IF NOT EXISTS ghl_contacts_org_created_idx
    ON ghl_contacts (organization_id, ghl_created_at);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
    ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS sync_runs_org_started_idx
    ON sync_runs (organization_id, started_at DESC);
CREATE INDEX IF NOT EXISTS sync_runs_connection_id_idx
    ON sync_runs (connection_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'organizations'::regclass
          AND tgname = 'organizations_set_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER organizations_set_updated_at
            BEFORE UPDATE ON organizations
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'users'::regclass
          AND tgname = 'users_set_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER users_set_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'integration_connections'::regclass
          AND tgname = 'integration_connections_set_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER integration_connections_set_updated_at
            BEFORE UPDATE ON integration_connections
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'ghl_contacts'::regclass
          AND tgname = 'ghl_contacts_set_updated_at'
          AND NOT tgisinternal
    ) THEN
        CREATE TRIGGER ghl_contacts_set_updated_at
            BEFORE UPDATE ON ghl_contacts
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    END IF;
END
$$;
