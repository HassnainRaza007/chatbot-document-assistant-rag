import sqlite3

conn = sqlite3.connect("enterprise_ai_assistant.db")

rows = conn.execute(
    """
    SELECT
        id,
        session_id,
        role,
        substr(content, 1, 80),
        sources
    FROM chat_messages
    ORDER BY id DESC
    LIMIT 4
    """
).fetchall()

for row in rows:
    print(row)

conn.close()