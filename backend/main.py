from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.config import engine, Base

from api.leads import router as leads_router
from api.messages import router as messages_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LeadRadar API")

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # colocar a url do front end
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leads_router)
app.include_router(messages_router)

if __name__ == "__main__":
    import uvicorn
    # Força o Uvicorn a usar o loop assíncrono padrão com suporte a subprocessos
    # mudar para 0.0.0.0 para ouvir todas as interfaces da rede
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, loop="asyncio")