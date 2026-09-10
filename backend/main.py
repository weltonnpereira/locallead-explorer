from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database.config import init_redis, close_redis

from api.leads import router as leads_router
from api.messages import router as messages_router
from api.crm import router as crm_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    yield
    await close_redis()

app = FastAPI(title="LeadRadar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # colocar a url do front end
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    res = await call_next(request)
    
    res.headers["X-Frame-Options"] = "DENY"
    
    res.headers["X-Content-Type-Options"] = "nosniff"
    
    res.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    res.headers["X-XSS-Protection"] = "1; mode=block"
    
    return res

app.include_router(leads_router)
app.include_router(messages_router)
app.include_router(crm_router)

if __name__ == "__main__":
    import uvicorn
    # Força o Uvicorn a usar o loop assíncrono padrão com suporte a subprocessos
    # mudar para 0.0.0.0 para ouvir todas as interfaces da rede
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, loop="asyncio")