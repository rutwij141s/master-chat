import uuid
from typing import Optional
from pydantic import BaseModel


class UserRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True
