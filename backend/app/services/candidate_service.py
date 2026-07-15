"""Candidate service — Supabase Auth removed, JWT-based authentication."""

from datetime import UTC, datetime

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import database
from app.core.security import hash_password
from app.schemas.invitation import CandidateRegisterRequest, OnboardingSaveRequest
from app.services.email_service import email_service
from app.services.invitation_service import InvitationService

import random


def _generate_otp() -> str:
    return str(random.SystemRandom().randint(100000, 999999))


class CandidateService:
    def __init__(self) -> None:
        self.invitation_service = InvitationService()

    # ------------------------------------------------------------------ #
    # CANDIDATE REGISTRATION (via invitation)                             #
    # ------------------------------------------------------------------ #

    async def register(self, request: CandidateRegisterRequest) -> dict:
        """
        Register a candidate via invitation link.
        Stores as pending_user, sends OTP; account activates after OTP verification.
        """
        invitation = await self.invitation_service._get_valid_invitation(request.invitation_token)

        if request.email.lower() != invitation["email"].lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use the email address that received this invitation.",
            )

        email = request.email.lower().strip()

        # Check duplicates
        for coll_name in ("candidates", "recruiters", "employees", "super_admins"):
            if await database[coll_name].find_one({"email": email}):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account already exists for this email address.",
                )
        if await database.users.find_one({"email": email}):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account already exists for this email address.",
            )

        otp = _generate_otp()
        now = datetime.now(UTC)

        from datetime import timedelta
        otp_expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        pending_expires_at = now + timedelta(minutes=30)

        await database.pending_users.replace_one(
            {"email": email},
            {
                "email": email,
                "full_name": request.full_name,
                "phone": request.phone,
                "password_hash": hash_password(request.password),
                "role": "candidate",
                "otp": otp,
                "otp_expires_at": otp_expires_at,
                "expires_at": pending_expires_at,
                "extra_data": {
                    "invitation_token": invitation["token"],
                    "job_title": invitation["job_title"],
                    "department": invitation["department"],
                    "start_date": invitation.get("start_date"),
                    "recruiter_id": invitation["recruiter_id"],
                    "onboarding": {
                        "status": "not_started",
                        "current_step": "personal",
                        "personal": None,
                        "emergency": None,
                        "employment": None,
                        "documents": None,
                        "submitted_at": None,
                    },
                },
                "created_at": now,
            },
            upsert=True,
        )

        # Mark invitation as accepted (pre-verification)
        await database.invitations.update_one(
            {"_id": invitation["_id"]},
            {"$set": {"status": "accepted", "updated_at": now}},
        )

        try:
            email_service.send_signup_otp(email, request.full_name, otp)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="We could not send the verification email. Please try again.",
            ) from exc

        await database.audit_logs.insert_one(
            {
                "email": email,
                "module": "authentication",
                "action": "candidate_registered",
                "outcome": "success",
                "created_at": now,
            }
        )

        return {
            "message": "Registration successful. A 6-digit verification code has been sent to your email.",
            "role": "candidate",
            "redirect_to": "/verify-email",
        }

    # ------------------------------------------------------------------ #
    # ONBOARDING                                                          #
    # ------------------------------------------------------------------ #

    async def get_onboarding(self, access_token: str) -> dict:
        candidate = await self._require_active_candidate(access_token)
        return {
            "candidate": self._public_user(candidate),
            "onboarding": candidate.get("onboarding")
            or {
                "status": "not_started",
                "current_step": "personal",
                "personal": None,
                "emergency": None,
                "employment": None,
                "documents": None,
                "submitted_at": None,
            },
        }

    async def save_onboarding(self, access_token: str, request: OnboardingSaveRequest) -> dict:
        candidate = await self._require_active_candidate(access_token)
        onboarding = candidate.get("onboarding") or {}

        if onboarding.get("status") == "submitted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Onboarding has already been submitted.",
            )

        updates: dict = {"updated_at": datetime.now(UTC)}

        if request.step == "personal":
            if not request.personal:
                raise HTTPException(status_code=400, detail="Personal information is required.")
            updates["onboarding.personal"] = request.personal.model_dump(mode="json")
            updates["onboarding.current_step"] = "emergency"
            updates["onboarding.status"] = "in_progress"
        elif request.step == "emergency":
            if not request.emergency:
                raise HTTPException(status_code=400, detail="Emergency contact is required.")
            updates["onboarding.emergency"] = request.emergency.model_dump(mode="json")
            updates["onboarding.current_step"] = "employment"
            updates["onboarding.status"] = "in_progress"
        elif request.step == "employment":
            if not request.employment:
                raise HTTPException(status_code=400, detail="Employment information is required.")
            updates["onboarding.employment"] = request.employment.model_dump(mode="json")
            updates["onboarding.current_step"] = "documents"
            updates["onboarding.status"] = "in_progress"
        elif request.step == "documents":
            if not request.documents:
                raise HTTPException(status_code=400, detail="Document acknowledgements are required.")
            updates["onboarding.documents"] = request.documents.model_dump(mode="json")
            updates["onboarding.current_step"] = "submit"
            updates["onboarding.status"] = "in_progress"
        elif request.step == "submit":
            required = ["personal", "emergency", "employment", "documents"]
            missing = [key for key in required if not onboarding.get(key)]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Complete these steps before submitting: {', '.join(missing)}.",
                )
            submitted_at = datetime.now(UTC)
            updates["onboarding.status"] = "submitted"
            updates["onboarding.current_step"] = "complete"
            updates["onboarding.submitted_at"] = submitted_at

            candidate_id = candidate.get("user_id") or str(candidate.get("_id", ""))
            await database.audit_logs.insert_one(
                {
                    "candidate_id": candidate_id,
                    "email": candidate["email"],
                    "module": "onboarding",
                    "action": "onboarding_submitted",
                    "outcome": "success",
                    "created_at": submitted_at,
                }
            )
            await self._ensure_employee_profile(candidate, submitted_at)

        await database.candidates.update_one({"_id": candidate["_id"]}, {"$set": updates})
        refreshed = await database.candidates.find_one({"_id": candidate["_id"]})
        return {
            "message": "Onboarding progress saved."
            if request.step != "submit"
            else "Onboarding submitted successfully.",
            "onboarding": refreshed.get("onboarding"),
            "candidate": self._public_user(refreshed),
        }

    async def _ensure_employee_profile(self, candidate: dict, now: datetime) -> None:
        """After onboarding, create an employee profile so they can sign in as Employee."""
        user_id = candidate.get("user_id")
        if not user_id:
            return

        existing = await database.employees.find_one({"user_id": user_id})
        if existing:
            return

        await database.employees.insert_one(
            {
                "user_id": user_id,
                "full_name": candidate["full_name"],
                "email": candidate["email"],
                "phone": candidate.get("phone"),
                "role": "employee",
                "status": "active",
                "job_title": candidate.get("job_title"),
                "department": candidate.get("department"),
                "candidate_id": user_id,
                "created_at": now,
                "updated_at": now,
            }
        )

    # ------------------------------------------------------------------ #
    # Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    async def _require_active_candidate(self, access_token: str) -> dict:
        """Decode the JWT and return the active candidate profile."""
        try:
            payload = jwt.decode(
                access_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
            )
            user_id: str = payload.get("user_id")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required.",
                )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
            ) from exc

        candidate = await database.candidates.find_one(
            {
                "$or": [{"user_id": user_id}, {"supabase_user_id": user_id}],
                "status": "active",
            }
        )
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only verified candidates can access onboarding.",
            )
        return candidate

    @staticmethod
    def _public_user(candidate: dict) -> dict:
        return {
            "id": candidate.get("user_id") or candidate.get("supabase_user_id", ""),
            "full_name": candidate["full_name"],
            "email": candidate["email"],
            "phone": candidate.get("phone"),
            "role": candidate["role"],
            "job_title": candidate.get("job_title"),
            "department": candidate.get("department"),
            "start_date": candidate.get("start_date"),
        }
