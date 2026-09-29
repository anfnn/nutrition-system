# patch_pydantic.py
import sys


def patch_email_validator():
    """Отключаем проверку email-validator"""
    try:
        from pydantic import networks

        # Сохраняем оригинал
        original_import = networks.import_email_validator

        # Подменяем на заглушку
        def dummy_import():
            pass

        networks.import_email_validator = dummy_import
        print("✅ Патч email-validator применён")
    except Exception as e:
        print(f"⚠️ Не удалось применить патч: {e}")


# Применяем патч ДО импорта моделей
patch_email_validator()