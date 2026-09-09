from schemas.message import MessageRequest
from schemas.message import ChannelEnum
from schemas.message import TargetTypeEnum

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