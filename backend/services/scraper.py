import asyncio
import urllib.parse
import re
from typing import List, Dict, Any
from playwright.async_api import async_playwright

async def get_reviews(active_panel, title) -> tuple:
    rating = None
    reviews = None

    try:
        rating_div = active_panel.locator('.F7nice').first

        if await rating_div.count() > 0:
            # Tenta aguardar brevemente até que o span com avaliações apareça dentro de .F7nice
            try:
                await rating_div.locator('span[aria-label*="avalia"]').first.wait_for(timeout=2000)
            except:
                pass

            rating_text = await rating_div.inner_text()

            # Tenta pegar a contagem diretamente do aria-label se existir
            try:
                reviews_span = rating_div.locator('span[aria-label*="avalia"]').first
                if await reviews_span.count() > 0:
                    aria_label = await reviews_span.get_attribute('aria-label')
                    if aria_label:
                        aria_match = re.search(r'([\d.,]+)\s*avalia', aria_label, re.IGNORECASE)
                        if aria_match:
                            reviews = int(aria_match.group(1).replace('.', '').replace(',', ''))
            except Exception:
                pass

            r_match = re.search(r'(\d[.,]\d)', rating_text)
            if r_match:
                rating = float(
                    r_match.group(1).replace(',', '.')
                )

            if reviews is None:
                rev_match = re.search(
                    r'\(([\d.,]+)\)',
                    rating_text
                )

                if rev_match:
                    reviews = int(
                        rev_match.group(1)
                        .replace('.', '')
                        .replace(',', '')
                    )

            if reviews is None:
                rev_match = re.search(
                    r'([\d.,]+)\s*(?:avaliações|avaliação|reviews|review)',
                    rating_text,
                    re.IGNORECASE
                )

                if rev_match:
                    reviews = int(
                        rev_match.group(1)
                        .replace('.', '')
                        .replace(',', '')
                    )
    except Exception as e:
        print(f"[DEBUG] Erro na função auxiliar get_reviews: {e}")

    return rating, reviews

async def scrape_google_maps(search_terms: str, city: str, target_count: int = 20) -> List[Dict[str, Any]]:
    query = f"{search_terms} em {city}"
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/{encoded_query}"
     
    leads = []
    seen_urls = set()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,mp4,webm}", lambda r: r.abort())
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            for _ in range(15):
                await page.evaluate('''() => {
                    const feed = document.querySelector('div[role="feed"]');
                    if (feed) feed.scrollTop = feed.scrollHeight;
                }''')
                await asyncio.sleep(1.2)
                
            elements = await page.query_selector_all('div[role="article"]')
            
            for el in elements[:target_count]:
                try:
                    title_el = await el.query_selector('.qBF1Pd')
                    title = await title_el.inner_text() if title_el else None
                    
                    if not title:
                        continue
                    
                    print(f"\n========== PROCESSANDO: {title} ==========")

                    await el.scroll_into_view_if_needed()
                    # Aguarda um tempinho rápido antes de clicar para estabilizar o scroll
                    await asyncio.sleep(0.5)
                    await el.click(force=True)

                    try:
                        safe_title = title.split('|')[0].split('-')[0].strip()[:15].lower()
                        await page.wait_for_function(
                            f"""(expected) => {{
                                const h1s = Array.from(document.querySelectorAll('h1'));
                                return h1s.some(h => h.innerText.toLowerCase().includes(expected));
                            }}""",
                            arg=safe_title,
                            timeout=5000
                        )
                    except Exception:
                        print(f"[WARN] Painel não abriu (ou nome não bateu) para '{title}'")
                        continue

                    # Aguarda o painel de detalhes carregar as informações
                    await asyncio.sleep(1.0)

                    try:
                        await page.wait_for_selector(
                            'div[role="main"] .F7nice',
                            timeout=4000
                        )
                    except Exception:
                        # .F7nice pode não existir (negócio sem avaliações)
                        pass

                    maps_url = page.url
                    # para comitar
                    if maps_url in seen_urls:
                        continue

                    seen_urls.add(maps_url)
                    
                    active_panel = page.locator('div[role="main"]').last
                    opened_title = await active_panel.locator('h1').first.inner_text()
                    print(f"[DEBUG] H1 aberto: {opened_title}")
                    
                    
                    phone = None
                    website = None
                    rating, reviews = await get_reviews(active_panel, title)
                    
                    sub_texts = active_panel.locator('.Io6YTe')
                    count = await sub_texts.count()
                    for i in range(count):
                        txt = await sub_texts.nth(i).inner_text()
                        phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', txt)
                        if phone_match and len(re.sub(r'\D', '', phone_match.group(0))) >= 8:
                            phone = phone_match.group(0).strip()
                            break
                        
                    site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
                    if await site_links.count() > 0:
                        website = await site_links.first.get_attribute('href')
                        
                    print(
                        f"[RESULT] {title} | "
                        f"rating={rating} | "
                        f"reviews={reviews} | "
                        f"phone={phone} | "
                        f"website={website}"
                    )
            
                    leads.append({
                        "name": title,
                        "phone": phone,
                        "rating": rating,
                        "reviews": reviews,
                        "city": city,
                        "category": search_terms,
                        "google_maps_url": maps_url,
                        "website": website
                    })
                except Exception as e:
                    print(f"Erro ao extrair {title}: {e}")
                    continue
        finally:
            await browser.close()
            
    return leads