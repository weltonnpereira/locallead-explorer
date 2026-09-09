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
            rating_text = await rating_div.inner_text()
            
            print(
                    f"[DEBUG] F7nice '{title}': "
                    f"{repr(rating_text)}"
                )
            
            r_match = re.search(r'(\d[.,]\d)', rating_text)
            if r_match:
                rating = float(
                    r_match.group(1).replace(',', '.')
                )
                
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
                    await el.click(force=True)
                    
                    try:
                        await page.wait_for_selector(
                            'div[role="main"] h1',
                            timeout=5000
                        )
                    except Exception:
                        print(f"[WARN] Painel não abriu para '{title}'")
                        continue
                        
                    await asyncio.sleep(1)
                    
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
              
            # for el in elements[:target_count]:
            #     try:
            #         title_el = await el.query_selector('.qBF1Pd')
            #         title = await title_el.inner_text() if title_el else None
                    
            #         if not title:
            #             continue
                    
            #         clickable = await el.query_selector('a') or title_el
            #         await clickable.scroll_into_view_if_needed()
            #         await asyncio.sleep(0.3)
            #         await clickable.click(force=True)
                    
            #         try:
            #             print("Aguardando o painel abrir...")
            #             safe_title = title.split('|')[0].split('-')[0].strip()[:15].lower()
            #             await page.wait_for_function(
            #                 f"""(expected) => {{
            #                     const h1s = Array.from(document.querySelectorAll('h1'));
            #                     return h1s.some(h => h.innerText.toLowerCase().includes(expected));
            #                 }}""",
            #                 arg=safe_title,
            #                 timeout=4000
            #             )
            #             print("Painel abriu e confirmou o nome")
            #         except Exception:
            #             print(f"Aviso: Timeout ao carregar h1 perfeito para '{title}'. Tentando capturar dados mesmo assim...")
            #             await asyncio.sleep(2.0)
                        
            #         await asyncio.sleep(0.5)
                    
            #         maps_url = page.url
            #         if maps_url in seen_urls:
            #             continue
            #         seen_urls.add(maps_url)
                    
            #         active_panel = page.locator('div[role="main"]').last
            #         phone = None
            #         website = None
            #         rating, reviews = await get_reviews(active_panel)
                    
            #         sub_texts = active_panel.locator('.Io6YTe')
            #         count = await sub_texts.count()
            #         for i in range(count):
            #             txt = await sub_texts.nth(i).inner_text()
            #             phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', txt)
            #             if phone_match and len(re.sub(r'\D', '', phone_match.group(0))) >= 8:
            #                 phone = phone_match.group(0).strip()
            #                 break
                        
            #         site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
            #         if await site_links.count() > 0:
            #             website = await site_links.first.get_attribute('href')
            
            #         leads.append({
            #             "name": title,
            #             "phone": phone,
            #             "rating": rating,
            #             "reviews": reviews,
            #             "city": city,
            #             "category": search_terms,
            #             "google_maps_url": maps_url,
            #             "website": website
            #         })
            #     except Exception as e:
            #         print(f"Erro ao extrair {title}: {e}")
            #         continue
        finally:
            await browser.close()
            
    return leads

# async def scrape_google_maps(search_terms: str, city: str, target_count: int = 20) -> List[Dict[str, any]]:
#     query = f"{search_terms} em {city}"
#     encoded_query = urllib.parse.quote(query)
#     url = f"https://www.google.com/maps/search/{encoded_query}"
     
#     leads = []
#     seen_names = set()
    
#     async with async_playwright() as p:
#         browser = await p.chromium.launch(headless=True)
#         context = await browser.new_context(
#             user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
#         )
#         page = await context.new_page()
        
#         await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,mp4,webm}", lambda r: r.abort())
        
#         try:
#             await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
#             target_count = 120
#             last_height = 0
#             retries = 0
            
#             try:
#                 for _ in range(60):
#                     await page.evaluate('''() => {
#                         const feed = document.querySelector('div[role="feed"]');
#                         if (feed) feed.scrollTop = feed.scrollHeight;
#                     }''')
#                     await asyncio.sleep(1.5)
                    
#                     current_elements = await page.query_selector_all('div[role="article"]')
                    
#                     if len(current_elements) == last_height:
#                         retries += 1
#                         if retries >= 4:
#                             break
#                     else:
#                         retries = 0
#                     last_height = len(current_elements)
#             except Exception as e:
#                 print(f"Erro no scroll: {e}")
            
#             for _ in range(2):
#                 await page.mouse.wheel(0, 3000)
#                 await asyncio.sleep(1)
                
#             elements = await page.query_selector_all('div[role="article"]')
            
#             for el in elements[:target_count]:
#                 try:
#                     title_el = await el.query_selector('.qBF1Pd')
#                     title = await title_el.inner_text() if title_el else None
                    
#                     if not title or title in seen_names:
#                         continue
                    
#                     clickable_area = await el.query_selector('a')
                    
#                     if clickable_area:
#                         await clickable_area.scroll_into_view_if_needed()
#                         await asyncio.sleep(0.5)
#                         await clickable_area.click(force=True)
#                     else:
#                         await title_el.scroll_into_view_if_needed()
#                         await asyncio.sleep(0.5)
#                         await title_el.click(force=True)

#                     panel_updated = False
#                     try:
#                         print("Aguardando o painel abrir...")
#                         await page.wait_for_function(
#                             """(expectedTitle) => {
#                                 const h1s = document.querySelectorAll('h1');
#                                 for (let h1 of h1s) {
#                                     // Compara ignorando espaços extras
#                                     if (h1.innerText.trim() === expectedTitle.trim()) {
#                                         return true;
#                                     }
#                                 }
#                                 return false;
#                             }""",
#                             arg=title,
#                             timeout=4500 # Espera até 4.5 segundos pelo painel
#                         )
#                         panel_updated = True
#                         print("Painel abriu e confirmou o nome!")
#                     except Exception:
#                         print("O clique falhou ou o painel não atualizou. Pulando para evitar duplicação!")
#                         continue

#                     await asyncio.sleep(0.8)

#                     details_text = await el.inner_text()
                    
#                     rating_match = re.search(r'(\d[.,]\d)\b', details_text)
#                     rating = None
#                     if rating_match:
#                         try:
#                             val = float(rating_match.group(1).replace(',', '.'))
#                             rating = str(val) if 1.0 <= val <= 5.0 else None
#                         except ValueError:
#                             pass
                            
#                     address = None
#                     lines = [line.strip() for line in details_text.split('\n') if line.strip()]
#                     for line in lines:
#                         if "·" in line and not re.search(r'\d{4,5}-\d{4}', line):
#                             address = line.split("·")[-1].strip()
#                             break

#                     active_panel = page.locator('div[role="main"]').last
#                     phone = None
#                     website = None
                    
#                     try:
#                         sub_texts_loc = active_panel.locator('.Io6YTe')
#                         count_sub = await sub_texts_loc.count()
#                         for i in range(count_sub):
#                             txt = await sub_texts_loc.nth(i).inner_text()
#                             if txt:
#                                 phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', txt)
#                                 if phone_match:
#                                     matched_str = phone_match.group(0).strip()
#                                     if len(re.sub(r'\D', '', matched_str)) >= 8:
#                                         phone = matched_str
#                                         break
#                     except Exception:
#                         pass

#                     try:
#                         site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
#                         if await site_links.count() > 0:
#                             website = await site_links.first.get_attribute('href')
#                     except Exception:
#                         pass
                    
#                     if not website:
#                         try:
#                             count_sub = await sub_texts_loc.count()
#                             for i in range(count_sub):
#                                 txt = await sub_texts_loc.nth(i).inner_text()
#                                 if txt and ("wa.me" in txt or "http" in txt or ".com" in txt or ".com.br" in txt):
#                                     if " " not in txt.strip(): 
#                                         website = txt if txt.startswith("http") else f"https://{txt}"
#                                         break
#                         except Exception:
#                             pass

#                     seen_names.add(title)
#                     leads.append({
#                         "name": title,
#                         "phone": phone,
#                         "rating": rating,
#                         "address": address,
#                         "website": website
#                     })
                    
#                     if len(leads) >= target_count:
#                         break
                        
#                 except Exception as e:
#                     print(f"Erro crítico ao processar {title}: {e}")
#                     continue
#         finally:
#             await browser.close()
            
#     return leads