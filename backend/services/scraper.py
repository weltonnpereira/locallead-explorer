import asyncio
import urllib.parse
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any
from playwright.async_api import async_playwright
from services.sanitization import sanitize_business_name


def canonical_maps_url(url: str | None) -> str | None:
    if not url:
        return None
    place_match = re.search(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", url, re.IGNORECASE)
    if place_match:
        return f"google-place:{place_match.group(1).lower()}"
    parsed = urllib.parse.urlsplit(url)
    return f"{parsed.netloc}{parsed.path}".rstrip("/").lower()


def normalize_identity(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"\W+", "", value.casefold(), flags=re.UNICODE)
    return normalized


def lead_identity(name: str | None, phone: str | None, address: str | None) -> tuple[str, str]:
    phone_digits = re.sub(r"\D", "", phone or "")
    if len(phone_digits) >= 8:
        return "phone", phone_digits[-8:]

    name_key = normalize_identity(name)
    address_key = normalize_identity(address)
    return "name-address", f"{name_key}:{address_key}"


async def get_card_maps_url(element) -> str | None:
    link = await element.query_selector('a[href*="/maps/place/"]')
    if not link:
        return None
    href = await link.get_attribute("href")
    return urllib.parse.urljoin("https://www.google.com", href) if href else None

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


async def get_address(active_panel) -> str | None:
    def valid_address(value: str | None) -> str | None:
        if not value:
            return None

        address = " ".join(value.split())
        normalized = address.casefold()
        invalid_fragments = (
            "aberto",
            "fecha",
            "fechado",
            "open",
            "closes",
            "horário",
            "hours",
        )

        if any(fragment in normalized for fragment in invalid_fragments):
            return None
        if len(address) < 8 or not any(character.isdigit() for character in address):
            return None
        return address

    address_selectors = (
        '[data-item-id="address"]',
        'button[data-item-id="address"]',
        'a[data-item-id="address"]',
    )

    for selector in address_selectors:
        address_element = active_panel.locator(selector).first
        if await address_element.count() == 0:
            continue

        address = valid_address(await address_element.inner_text())
        if address:
            return address

    details_text = await active_panel.inner_text()
    lines = [line.strip() for line in details_text.splitlines() if line.strip()]
    phone_pattern = re.compile(r"(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}")
    excluded = (
        "website",
        "site",
        "horário",
        "hours",
        "avaliações",
        "reviews",
        "aberto",
        "fecha",
        "fechado",
        "open",
        "closes",
    )

    for line in lines:
        normalized_line = line.lower()
        if phone_pattern.search(line):
            continue
        if any(value in normalized_line for value in excluded):
            continue
        address = valid_address(line)
        if address:
            return address

    return None

async def _load_all_results(page, max_scrolls: int = 120) -> None:
    """Rola o feed até a altura e a quantidade de cards permanecerem estáveis."""
    previous_height = -1
    previous_count = -1
    stable_rounds = 0

    for _ in range(max_scrolls):
        await page.evaluate('''() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTop = feed.scrollHeight;
        }''')
        await asyncio.sleep(1.2)

        metrics = await page.evaluate('''() => {
            const feed = document.querySelector('div[role="feed"]');
            if (!feed) return null;
            return {
                height: feed.scrollHeight,
                top: feed.scrollTop,
                viewport: feed.clientHeight,
                count: feed.querySelectorAll('div[role="article"]').length,
            };
        }''')

        if not metrics:
            return

        at_bottom = (
            metrics["top"] + metrics["viewport"]
            >= metrics["height"] - 5
        )
        unchanged = (
            metrics["height"] == previous_height
            and metrics["count"] == previous_count
        )

        if at_bottom and unchanged:
            stable_rounds += 1
            if stable_rounds >= 3:
                return
        else:
            stable_rounds = 0

        previous_height = metrics["height"]
        previous_count = metrics["count"]


async def scrape_google_maps(
    search_terms: str,
    city: str,
    target_count: int | None = None,
    known_leads: Dict[str, datetime | None] | None = None,
    refresh_hours: int = 24,
) -> List[Dict[str, Any]]:
    query = f"{search_terms} em {city}"
    encoded_query = urllib.parse.quote(query)
    url = f"https://www.google.com/maps/search/{encoded_query}"
     
    leads = []
    seen_urls = set()
    seen_identities = set()
    known_leads = known_leads or {}
    refresh_before = datetime.utcnow() - timedelta(hours=refresh_hours)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        await page.route("**/*.{png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,mp4,webm}", lambda r: r.abort())
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            await _load_all_results(page)
                
            elements = await page.query_selector_all('div[role="article"]')
            
            elements_to_process = elements if target_count is None else elements[:target_count]
            for el in elements_to_process:
                try:
                    title_el = await el.query_selector('.qBF1Pd')
                    title = sanitize_business_name(await title_el.inner_text()) if title_el else None
                    
                    if not title:
                        continue

                    card_url = await get_card_maps_url(el)
                    canonical_card_url = canonical_maps_url(card_url)
                    card_identity = (
                        ("name", normalize_identity(title))
                        if not canonical_card_url
                        else None
                    )
                    if canonical_card_url and canonical_card_url in seen_urls:
                        continue
                    if card_identity and card_identity in seen_identities:
                        continue
                    last_scraped_at = known_leads.get(canonical_card_url)
                    if (
                        canonical_card_url
                        and canonical_card_url in known_leads
                        and last_scraped_at
                        and last_scraped_at >= refresh_before
                    ):
                        leads.append({
                            "name": title,
                            "city": city,
                            "category": search_terms,
                            "google_maps_url": card_url,
                            "_skipped_refresh": True,
                        })
                        if card_identity:
                            seen_identities.add(card_identity)
                        if canonical_card_url:
                            seen_urls.add(canonical_card_url)
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
                    canonical_maps = canonical_maps_url(maps_url)
                    if canonical_maps in seen_urls:
                        continue

                    seen_urls.add(canonical_maps or maps_url)
                    
                    active_panel = page.locator('div[role="main"]').last
                    opened_title = await active_panel.locator('h1').first.inner_text()
                    print(f"[DEBUG] H1 aberto: {opened_title}")
                    
                    phone = None
                    website = None
                    address = await get_address(active_panel)
                    rating, reviews = await get_reviews(active_panel, title)
                    
                    sub_texts = active_panel.locator('.Io6YTe')
                    count = await sub_texts.count()
                    for i in range(count):
                        txt = await sub_texts.nth(i).inner_text()
                        phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', txt)
                        if phone_match and len(re.sub(r'\D', '', phone_match.group(0))) >= 8:
                            phone = phone_match.group(0).strip()
                            break

                    identity = lead_identity(title, phone, address)
                    if identity in seen_identities:
                        continue
                    seen_identities.add(identity)
                        
                    site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
                    if await site_links.count() > 0:
                        website = await site_links.first.get_attribute('href')
                        
                    print(
                        f"[RESULT] {title} | "
                        f"rating={rating} | "
                        f"reviews={reviews} | "
                        f"phone={phone} | "
                        f"address={address} | "
                        f"website={website}"
                    )
            
                    leads.append({
                        "name": title,
                        "phone": phone,
                        "address": address,
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