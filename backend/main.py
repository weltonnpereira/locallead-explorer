import asyncio
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from playwright.async_api import async_playwright
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from enum import Enum

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
            "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,mp4,webm}",
            lambda route: route.abort()
        )
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            target_count = 120
            last_height = 0
            retries = 0
            
            try:
                for _ in range(60):
                    await page.evaluate('''() => {
                        const feed = document.querySelector('div[role="feed"]');
                        if (feed) feed.scrollTop = feed.scrollHeight;
                    }''')
                    await asyncio.sleep(1.5)
                    
                    current_elements = await page.query_selector_all('div[role="article"]')
                    
                    if len(current_elements) == last_height:
                        retries += 1
                        if retries >= 4:
                            break
                    else:
                        retries = 0 # se encontrou zera o contador de erro
                    last_height = len(current_elements)
            except Exception:
                print(f"Erro no scroll: {e}")
            
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
                    
                    # print(f"\n[{len(leads)+1}] 🔎 Processando: {title}")
                    
                    # 1. TENTA CLICAR NO LINK INVISÍVEL DO CARD (Mais seguro que o título)
                    clickable_area = await el.query_selector('a')
                    
                    if clickable_area:
                        await clickable_area.scroll_into_view_if_needed()
                        await asyncio.sleep(0.5) # Espera o scroll "assentar"
                        await clickable_area.click(force=True)
                    else:
                        await title_el.scroll_into_view_if_needed()
                        await asyncio.sleep(0.5)
                        await title_el.click(force=True)

                    # 2. VERIFICAÇÃO BLINDADA: Só continua se o H1 do painel for igual ao nome da empresa
                    panel_updated = False
                    try:
                        print("Aguardando o painel abrir...")
                        await page.wait_for_function(
                            """(expectedTitle) => {
                                const h1s = document.querySelectorAll('h1');
                                for (let h1 of h1s) {
                                    // Compara ignorando espaços extras
                                    if (h1.innerText.trim() === expectedTitle.trim()) {
                                        return true;
                                    }
                                }
                                return false;
                            }""",
                            arg=title,
                            timeout=4500 # Espera até 4.5 segundos pelo painel
                        )
                        panel_updated = True
                        print("Painel abriu e confirmou o nome!")
                    except Exception:
                        print("O clique falhou ou o painel não atualizou. Pulando para evitar duplicação!")
                        continue

                    await asyncio.sleep(0.8)

                    details_text = await el.inner_text()
                    
                    rating_match = re.search(r'(\d[.,]\d)\b', details_text)
                    rating = None
                    if rating_match:
                        try:
                            val = float(rating_match.group(1).replace(',', '.'))
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
                    phone = None
                    website = None
                    
                    try:
                        sub_texts_loc = active_panel.locator('.Io6YTe')
                        count_sub = await sub_texts_loc.count()
                        for i in range(count_sub):
                            txt = await sub_texts_loc.nth(i).inner_text()
                            if txt:
                                phone_match = re.search(r'(?:\(?\d{2}\)?\s?)?(?:9?\d{4})[-.\s]?\d{4}', txt)
                                if phone_match:
                                    matched_str = phone_match.group(0).strip()
                                    if len(re.sub(r'\D', '', matched_str)) >= 8:
                                        phone = matched_str
                                        break
                    except Exception:
                        pass

                    try:
                        site_links = active_panel.locator('a[data-value="Website"], a[data-item-id="authority"]')
                        if await site_links.count() > 0:
                            website = await site_links.first.get_attribute('href')
                    except Exception:
                        pass
                    
                    if not website:
                        try:
                            count_sub = await sub_texts_loc.count()
                            for i in range(count_sub):
                                txt = await sub_texts_loc.nth(i).inner_text()
                                if txt and ("wa.me" in txt or "http" in txt or ".com" in txt or ".com.br" in txt):
                                    if " " not in txt.strip(): 
                                        website = txt if txt.startswith("http") else f"https://{txt}"
                                        break
                        except Exception:
                            pass
                            
                    # print(f"   📞 Telefone: {phone}")
                    # print(f"   🌐 Site: {website}")

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
                    print(f"Erro crítico ao processar {title}: {e}")
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
    
class ChannelEnum(str, Enum):
    whatsapp = "whatsapp"
    email = "email"
    
class TargetTypeEnum(str, Enum):
    agency = "agency"
    niche_company = "niche_company"
    
class MessageRequest(BaseModel):
    channel: ChannelEnum = ChannelEnum.whatsapp
    target_type: TargetTypeEnum = TargetTypeEnum.niche_company
    company_name: str
    city: str
    niche: Optional[str] = "negócios locais"
    lead_count: int = 50
    
def generate_pitch_message(data: MessageRequest) -> dict:
    channel = data.channel
    target = data.target_type
    company = data.company_name
    city = data.city
    niche = data.niche
    count = data.lead_count
    
    subject = None
    
    if target == TargetTypeEnum.agency:
        if channel == ChannelEnum.whatsapp:
            text = (
                f"Olá, equipe da {company}! Tudo bem?"
                f"Estava acompanhando o trabalho de vocês e vi que atendem empresas e negócios locais de destaque."
                f"Como sei que {niche} costumam ser excelentes clientes para agências (pelo alto ticket dos serviços), "
                f"rodei uma ferramenta nossa e separei {count} leads desse segmento aí na região de {city}, com telefone, endereço e reputação filtrados."
                f"Montei uma planilha com essa lista e queria te mandar de presente, sem custo e sem compromisso, para o time comercial de vocês testar e prospectar essa semana."
                f"Posso te enviar o arquivo por aqui?"
            )
        else:
            subject = f"{count} leads de {niche} em {city} (cortesia para a {company})"
            text = (
                f"Olá, pessoal da {company}, tudo bem? "
                f" Estava acompanhando o trabalho de vocês e vi que prestam serviços de marketing para empresas locais."
                f"Sabendo que {niche} é um mercado com excelente ticket médio, geramos uma amostra de {count} contatos "
                f"atualizados desse segmento em {city}, já com telefone e reputação filtrados."
                f"Essa lista é 100% gratuita para sua equipe testar. Se os dados forem úteis e trouxerem novos clientes para vocês, "
                f"conversamos sobre fornecer volumes maiores (500 a 1.000 leads/mês)."
                f"Qual o melhor e-mail ou WhatsApp para eu te enviar esse arquivo?"
            )
    else:
        if channel == ChannelEnum.whatsapp:
            text = (
                f"Olá, pessoal da {company}! Tudo bem?"
                f"Estava mapeando o mercado de {niche} aqui em {city} e rodei uma ferramenta nossa que separou "
                f"{count} leads locais validados com telefone, endereço e nota no Google."
                f"Montei uma planilha com esses dados e queria te mandar de presente, sem custo e sem compromisso nenhum, "
                f"para a equipe comercial de vocês testar aí essa semana."
                f"Posso te enviar a planilha por aqui ou prefere por e-mail?"
            )
        else:  # E-mail / LinkedIn
            subject = f"{count} leads de {niche} em {city} (cortesia para a {company})"
            text = (
                f"Olá, equipe da {company}, tudo bem?"
                f"Notei que vocês atendem/atuam no segmento de {niche} e resolvi gerar uma amostra da nossa base de dados para vocês avaliarem."
                f"Separei {count} contatos atualizados de {niche} em {city}, já com telefone e reputação filtrados."
                f"A lista é 100% sua para a sua equipe ligar ou prospectar como quiser. Se os dados forem úteis e trouxerem reuniões para vocês, "
                f"aí conversamos sobre como te entregar 500 ou 1.000 por mês."
                f"Qual o melhor e-mail ou WhatsApp para eu te enviar esse arquivo?"
            )
            
    return {
        "subject": subject,
        "message": text
    }
    
@app.post("/api/v1/message")
async def message_to_send(payload: MessageRequest):
    result = generate_pitch_message(payload)
    
    return {
        "status": "success",
        "data": {
            "channel": payload.channel,
            "target_type": payload.target_type,
            "subject": result["subject"],
            "message": result["message"]
        }
    }
    
if __name__ == "__main__":
    import uvicorn
    # Força o Uvicorn a usar o loop assíncrono padrão com suporte a subprocessos
    uvicorn.run("main:app", host="localhost", port=8000, reload=True, loop="asyncio")