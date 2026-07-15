import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$")
PHONE_PATTERN = re.compile(r"^[+()\-\s\d]{7,20}$")


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str
    confirm_password: str
    terms_accepted: bool

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized_value = " ".join(value.split())
        if len(normalized_value) < 2:
            raise ValueError("Full name must contain at least two characters.")
        return normalized_value

    @field_validator("email")
    @classmethod
    def validate_company_email(cls, value: EmailStr) -> str:
        normalized_email = value.lower()
        if not normalized_email.endswith("@gmail.com"):
            raise ValueError("Use a valid @gmail.com company email address.")
        return normalized_email

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized_value = value.strip()
        if not PHONE_PATTERN.fullmatch(normalized_value):
            raise ValueError("Enter a valid phone number.")
        return normalized_value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @model_validator(mode="after")
    def validate_registration(self):
        if self.password != self.confirm_password:
            raise ValueError("Password confirmation does not match.")
        if not self.terms_accepted:
            raise ValueError("You must accept the Terms & Conditions.")
        return self


# --- OTP Verification (signup) ---

class VerifyOTPRequest(BaseModel):
    """Verify signup OTP."""
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.lower().strip()


# --- Kept for backward-compatibility with frontend that sends access_token ---
class VerifyEmailRequest(BaseModel):
    """Legacy: accepts either access_token (old) or {email, otp} (new)."""
    access_token: str | None = None
    email: EmailStr | None = None
    otp: str | None = None


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResendOTPRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["recruiter", "candidate", "employee", "super_admin"]
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """OTP-based password reset."""
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.lower().strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError("Password confirmation does not match.")
        return self


class ChangePasswordRequest(BaseModel):
    """Authenticated user changes their own password."""
    current_password: str
    new_password: str
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("Password confirmation does not match.")
        return self


class BootstrapSuperAdminRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized_value = " ".join(value.split())
        if len(normalized_value) < 2:
            raise ValueError("Full name must contain at least two characters.")
        return normalized_value

    @field_validator("email")
    @classmethod
    def validate_company_email(cls, value: EmailStr) -> str:
        normalized_email = value.lower()
        if not normalized_email.endswith("@gmail.com"):
            raise ValueError("Use a valid @gmail.com email address.")
        return normalized_email

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized_value = value.strip()
        if not PHONE_PATTERN.fullmatch(normalized_value):
            raise ValueError("Enter a valid phone number.")
        return normalized_value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise ValueError(
                "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            )
        return value

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError("Password confirmation does not match.")
        return self