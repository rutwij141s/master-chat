-- Initialize PostgreSQL database schema extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant privileges if needed
GRANT ALL PRIVILEGES ON DATABASE masterchat_db TO masterchat;
