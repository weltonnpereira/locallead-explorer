import asyncio
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.async_api import async_playwright
import re
import httpx
from bs4 import BeautifulSoup

app = FastAPI(title="Leads Extractor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # colocar a url do front end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# lovable model request
class ScrapingRequest(BaseModel):
    term: str
    city: str

# async def scrape_google_maps(search_terms: str, city: str):
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
        
#         await page.route(
#             "**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,eot,ttf,mp4,webm}",
#             lambda route: route.abort()
#         )
        
#         try:
#             await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
#             try:
#                 await page.wait_for_selector('div[role="feed"]', timeout=5000)
#             except Exception:
#                 pass
            
#             for _ in range(2):
#                 await page.mouse.wheel(0, 3000)
#                 await asyncio.sleep(1)
                
#             elements = await page.query_selector_all('div[role="article"]')
            
#             for el in elements[:10]:
#                 try:
#                     title_el = await el.query_selector('.qBF1Pd')
#                     title = await title_el.inner_text() if title_el else None
                    
#                     if not title or title in seen_names:
#                         continue
                    
#                     details_text = await el.inner_text()
                    
#                     rating_match = re.search(r'(\d[.,]\d)\b', details_text)
#                     rating = None
#                     if rating_match:
#                         rate_val = rating_match.group(1).replace(',', '.')
#                         try:
#                             val = float(rate_val)
#                             rating = str(val) if 1.0 <= val <= 5.0 else None
#                         except ValueError:
#                             pass
                            
#                     address = None
#                     lines = [line.strip() for line in details_text.split('\n') if line.strip()]
#                     for line in lines:
#                         if "·" in line and not re.search(r'\d{4,5}-\d{4}', line):
#                             address = line.split("·")[-1].strip()
#                             break

#                     if title_el:
#                         await title_el.scroll_into_view_if_needed()
#                         await title_el.click(force=True)
                        
#                         try:
#                             escaped_title = title.replace('"', '\\"')
#                             await page.wait_for_selector(f'h1:has-text("{escaped_title}")', state="visible", timeout=4000)
#                             await page.wait_for_timeout(500)
#                         except Exception:
#                             await page.wait_for_timeout(3000)
                    
#                     sub_elements = await page.query_selector_all('.Io6YTe')
                    
#                     sub_texts = []
#                     for sub in sub_elements:
#                         t = await sub.inner_text()
#                         if t:
#                             sub_texts.append(t.strip())
                            
#                     full_panel_text = details_text + " " + " ".join(sub_texts)
                    
#                     phone = None
#                     phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', full_panel_text)
#                     if phone_match:
#                         matched_str = phone_match.group(0).strip()
#                         if len(re.sub(r'\D', '', matched_str)) >= 8:
#                             phone = matched_str
                            
                    # website = None
                    # site_links = await page.query_selector_all('a[data-value="Website"], a[data-item-id="authority"]')
                    # for sl in site_links:
                    #     href = await sl.get_attribute('href')
                    #     if href:
                    #         website = href
                    #         break
                            
                    # if not website:
                    #     for text in sub_texts:
                    #         if "wa.me" in text or "http" in text or ".com" in text or ".com.br" in text:
                    #             website = text if text.startswith("http") else f"https://{text}"
                    #             break
                    
#                     seen_names.add(title)
#                     leads.append({
#                         "name": title,
#                         "phone": phone,
#                         "rating": rating,
#                         "address": address,
#                         "website": website
#                     })
                    
#                     if len(leads) >= 30:
#                         break
#                 except Exception as e:
#                     print(f"Erro ao processar {title}: {e}")
#                     continue
#         finally:
#             await browser.close()
            
#     return leads

async def find_instagram(company_name: str, city: str) -> str:
    try:
        query = f"instagram {company_name} {city}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for a in soup.find_all('a', class_='result__url'):
                    href = a.get('href', '')
                    if "instagram.com/" in href:
                        if "//duckduckgo.com/l/?" in href:
                            match = re.search(r'uddg=(https?://[^&]+)', href)
                            if match:
                                return urllib.parse.unquote(match.group(1))
                        return href
    except Exception:
        pass
    return None

async def scrape_google_maps(search_terms: str, city: str):
    query = f"{search_terms} em {city}"
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/{encoded_query}"
     
    leads = []
    seen_names = set()
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.route(
            "**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,eot,ttf,mp4,webm}",
            lambda route: route.abort()
        )
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            target_count = 50
            last_height = 0
            
            try:
                for _ in range(15):
                    await page.evaluate('''() => {
                        const feed = document.querySelector('div[role="feed"]');
                        if (feed) feed.scrollTop = feed.scrollHeight;
                    }''')
                    await asyncio.sleep(0.8) # Reduzido de 1.5s para 0.8s
                    
                    current_elements = await page.query_selector_all('div[role="article"]')
                    if len(current_elements) >= target_count or len(current_elements) == last_height:
                        break
                    last_height = len(current_elements)
            except Exception:
                pass
            
            for _ in range(2):
                await page.mouse.wheel(0, 3000)
                await asyncio.sleep(1)
                
            elements = await page.query_selector_all('div[role="article"]')
            
            for el in elements[:target_count]:
                try:
                    title_el = await el.query_selector('.qBF1Pd')
                    title = await title_el.inner_text() if title_el else None
                    
                    if not title or title in seen_names:
                        continue
                    
                    details_text = await el.inner_text()
                    
                    rating_match = re.search(r'(\d[.,]\d)\b', details_text)
                    rating = None
                    if rating_match:
                        rate_val = rating_match.group(1).replace(',', '.')
                        try:
                            val = float(rate_val)
                            rating = str(val) if 1.0 <= val <= 5.0 else None
                        except ValueError:
                            pass
                            
                    address = None
                    lines = [line.strip() for line in details_text.split('\n') if line.strip()]
                    for line in lines:
                        if "·" in line and not re.search(r'\d{4,5}-\d{4}', line):
                            address = line.split("·")[-1].strip()
                            break

                    active_panel = page.locator('div[role="main"]').last
                    before_title = ""
                    try:
                        if await active_panel.locator('h1').count() > 0:
                            before_title = await active_panel.locator('h1').first.inner_text()
                    except Exception:
                        pass

                    if title_el:
                        await title_el.scroll_into_view_if_needed()
                        await title_el.click(force=True)

                        try:
                            if before_title:
                                await page.wait_for_function(
                                    f'''(titulo_velho) => {{
                                        const h1 = document.querySelectorAll('div[role="main"] h1');
                                        if (h1.length === 0) return false;
                                        const titulo_novo = h1[h1.length - 1].innerText;
                                        return titulo_novo && titulo_novo !== titulo_velho;
                                    }}''', 
                                    arg=before_title, 
                                    timeout=4000
                                )
                            else:
                                await active_panel.locator('h1').first.wait_for(state="visible", timeout=4000)
                                
                        except Exception:
                            print(f"⚠️ O painel demorou mais de 4s para atualizar. Pulando...")
                            continue

                        sub_texts_loc = active_panel.locator('.Io6YTe')
                        count_sub = await sub_texts_loc.count()
                        
                        sub_texts = []
                        for i in range(count_sub):
                            txt = await sub_texts_loc.nth(i).inner_text()
                            if txt:
                                sub_texts.append(txt)
                                
                        full_panel_text = details_text + " " + " ".join(sub_texts)
                        
                        phone = None
                        phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', full_panel_text)
                        if phone_match:
                            matched_str = phone_match.group(0).strip()
                            if len(re.sub(r'\D', '', matched_str)) >= 8:
                                phone = matched_str

                        website = None
                        site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
                        quantidade_links = await site_links.count()
                        
                        if quantidade_links > 0:
                            for i in range(quantidade_links):
                                href = await site_links.nth(i).get_attribute('href')
                                if href:
                                    website = href
                                    break
                                    
                        if not website:
                            for text in sub_texts:
                                if text and ("wa.me" in text or "http" in text or ".com" in text or ".com.br" in text):
                                    website = text if text.startswith("http") else f"https://{text}"
                                    break

                    seen_names.add(title)
                    leads.append({
                        "name": title,
                        "phone": phone,
                        "rating": rating,
                        "address": address,
                        "website": website
                    })
                    
                    if len(leads) >= target_count:
                        break
                except Exception as e:
                    print(f"Erro ao processar {title}: {e}")
                    continue
        finally:
            await browser.close()
            
    return leads
    
@app.post("/api/v1/scrape")
async def init_scraping(payload: ScrapingRequest):
    if not payload.term or not payload.city:
        raise HTTPException(status_code=400, detail="Termo e cidade são obrigatórios.")
    
    results = await scrape_google_maps(payload.term, payload.city)

    return {
        "status": "success",
        "total_founded": len(results),
        "data": results
    }
    
if __name__ == "__main__":
    import uvicorn
    # Força o Uvicorn a usar o loop assíncrono padrão com suporte a subprocessos
    uvicorn.run("main:app", host="localhost", port=8000, reload=True, loop="asyncio")