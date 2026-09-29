from contextlib import contextmanager
from typing import Optional, Any, Dict, List
import pymysql
from pymysql.cursors import DictCursor
from app.config import settings

class Database:
    def __init__(self):
        self.connection = None

    def connect(self):
        self.connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            db=settings.DB_NAME,
            charset='utf8mb4',
            cursorclass=DictCursor,
            autocommit=True,
            connect_timeout=10
        )
        print(f"✓ Подключено к БД: {settings.DB_NAME}")

    def disconnect(self):
        if self.connection:
            self.connection.close()

    @contextmanager
    def get_cursor(self):
        if not self.connection or not self.connection.open:
            self.connect()
        cursor = self.connection.cursor()
        try:
            yield cursor
        finally:
            cursor.close()

    def fetch_all(self, query, params=None):
        with self.get_cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchall()

    def fetch_one(self, query, params=None):
        with self.get_cursor() as cur:
            cur.execute(query, params or ())
            result = cur.fetchone()
            return result if result else None

    def execute(self, query, params=None):
        with self.get_cursor() as cur:
            cur.execute(query, params or ())
            return cur.lastrowid or cur.rowcount

db = Database()