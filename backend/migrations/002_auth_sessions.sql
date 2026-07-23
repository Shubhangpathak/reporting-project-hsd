DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'users contains duplicate email addresses when compared case-insensitively';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS user_sessions_expire_idx
    ON user_sessions (expire);
