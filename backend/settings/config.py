import os
from dotenv import load_dotenv

load_dotenv()

# comando para eu colocar no wsl ao liga-lo para ativar postgresql
# sudo service postgresql start
# sudo service postgresql status

# sudo service redis-server start

# comando para ativar redis no terminal
# redis-cli
# listar todas as chaves
# KEYS *

# comando ativar postgresql no terminal
# sudo -i -u postgres psql
# listar tabelas no banco
# \l
# conectar a um banco de dados especifico
# \c nome_do_seu_banco
# listar tabelas do banco conectado
# \dt
# visualizar dados de uma tabela especifica conectada
# SELECT * FROM nome_da_tabela;
# DROP DATABASE nome_do_banco; -- para deletar o banco de dados

# config para alembic
# Primeiro crie o banco, por exemplo:
# sudo -u postgres createdb leadradar
# cd /home/ubuntu/leadradar/backend
#source venv/bin/activate
# alembic upgrade head
# Verifique o estado:
# alembic current
#Quando adicionar uma tabela

#Adicione o modelo em models.py.

#Gere a migration:
#alembic revision --autogenerate -m "add nome da tabela"
# backend/migrations/versions/
# backend/migrations/versions/
# Aplique a alteração:
# alembic upgrade head
# alembic check


DATABASE_URL = os.getenv("DATABASE_URL")