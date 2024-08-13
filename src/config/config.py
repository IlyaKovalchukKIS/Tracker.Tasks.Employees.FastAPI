import os

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY_AUTH = os.getenv("SECRET_KEY_AUTH")
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_ECHO = bool(os.getenv("DB_ECHO"))
DB_USER = os.getenv("DB_USER")
DB_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:5432/postgres"
