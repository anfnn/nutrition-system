from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database (соответствует вашему init.sql)
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "diet_system"  # ← имя БД из вашего SQL
    DB_USER: str = "root"
    DB_PASSWORD: str = ""

    # Security
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:80"

    class Config:
        env_file = ".env"
        extra = "ignore"  # ← ДОБАВЬТЕ ЭТУ СТРОКУ!



settings = Settings()