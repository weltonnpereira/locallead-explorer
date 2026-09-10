import asyncio
from services.scraper import scrape_google_maps

async def main():
    leads = await scrape_google_maps("restaurantes", "são paulo", target_count=3)
    for l in leads:
        print(l)

asyncio.run(main())
