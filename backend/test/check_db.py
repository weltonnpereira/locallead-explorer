import sqlite3
import pprint
conn = sqlite3.connect("leads.db")
c = conn.cursor()
c.execute("SELECT id, name, google_rating, google_reviews, google_maps_url FROM leads")
for row in c.fetchall():
    print(row)
