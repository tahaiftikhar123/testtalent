from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from supabase import Client, create_client

from app.core.config import settings

mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
database: AsyncIOMotorDatabase = mongo_client[settings.DATABASE_NAME]

# Supabase client kept for Storage only — auth is handled by MongoDB + JWT
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def create_database_indexes() -> None:
    # ---------- Users (auth credentials) ----------
    await database.users.create_index("email", unique=True)
    await database.users.create_index("user_id", unique=True, sparse=True)

    # ---------- Pending users (pre-OTP-verification) ----------
    await database.pending_users.create_index("email", unique=True)
    # TTL: auto-remove unverified registrations after 30 minutes
    await database.pending_users.create_index("expires_at", expireAfterSeconds=0)

    # ---------- OTP Verifications ----------
    await database.otp_verifications.create_index("email", unique=True)
    # TTL: auto-remove expired OTPs
    await database.otp_verifications.create_index("expires_at", expireAfterSeconds=0)

    # ---------- Refresh Tokens ----------
    await database.refresh_tokens.create_index("token", unique=True)
    await database.refresh_tokens.create_index("user_id")
    await database.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

    # ---------- Recruiters ----------
    await database.recruiters.create_index("email", unique=True)
    await database.recruiters.create_index("user_id", unique=True, sparse=True)

    # ---------- Audit Logs ----------
    await database.audit_logs.create_index([("created_at", -1)])
    await database.audit_logs.create_index([("recruiter_id", 1), ("created_at", -1)])

    # ---------- Invitations ----------
    await database.invitations.create_index("token", unique=True)
    await database.invitations.create_index([("email", 1), ("status", 1)])
    await database.invitations.create_index([("recruiter_id", 1), ("created_at", -1)])
    await database.invitations.create_index("expires_at")

    # ---------- Candidates ----------
    await database.candidates.create_index("email", unique=True)
    await database.candidates.create_index("user_id", unique=True, sparse=True)
    await database.candidates.create_index("invitation_token", unique=True, sparse=True)

    # ---------- Employees ----------
    await database.employees.create_index("email", unique=True)
    await database.employees.create_index("user_id", unique=True, sparse=True)

    # ---------- Super Admins ----------
    await database.super_admins.create_index("email", unique=True)
    await database.super_admins.create_index("user_id", unique=True, sparse=True)

    # ---------- Login Attempts (brute-force protection) ----------
    await database.login_attempts.create_index("email", unique=True)