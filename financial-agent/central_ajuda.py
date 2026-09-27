"""Central de Ajuda do app: procedimentos ("como faço X no app") viram link para o artigo, nunca passo a passo.

O front (itau_app) transforma [título](/ajuda/slug) em hiperlink dentro do app. Os artigos ainda não existem:
aqui só ficam o catálogo e as regras. Links fora do catálogo são reduzidos a texto por `limpar_links_ajuda`.
"""

import re

ARTIGOS_AJUDA: dict[str, str] = {
    "pix-agendar": "Como agendar um Pix",
    "pix-reagendar-cancelar": "Como reagendar ou cancelar um Pix agendado",
    "pix-copia-e-cola-qr-code": "Como pagar com Pix Copia e Cola ou QR Code",
    "pix-limites": "Como ajustar os limites do Pix",
    "pix-chaves": "Como cadastrar e gerenciar chaves Pix",
    "comprovantes": "Como encontrar e compartilhar comprovantes",
    "cartao-bloqueio-temporario": "Como bloquear e desbloquear o cartão",
    "cartao-virtual": "Como gerar e usar o cartão virtual",
    "cartao-limite": "Como ajustar o limite do cartão",
    "fatura-pagar-parcelar": "Como pagar ou parcelar a fatura",
    "debito-automatico": "Como cadastrar ou cancelar débito automático",
    "cancelar-assinatura": "Como cancelar uma assinatura de streaming ou serviço",
    "teto-de-gastos": "Como criar um teto de gastos por categoria",
    "alertas-de-gastos": "Como ativar os avisos de gastos",
    "cofrinho": "Como guardar dinheiro no Cofrinho",
    "metas-aportes": "Como criar metas e fazer aportes",
    "extrato-exportar": "Como consultar e exportar o extrato",
    "limite-da-conta": "Como funciona o limite da conta (cheque especial)",
    "seguranca-senhas": "Como alterar senhas e dispositivos de segurança",
    "central": "Central de Ajuda",
}

_LINK_AJUDA = re.compile(r"\[([^\]\n]{1,120})\]\((/ajuda/([a-z0-9-]{1,60}))\)")


def instrucao_central_ajuda() -> str:
    """Trecho do system prompt: como responder a pedidos de procedimento no app."""
    catalogo = "; ".join(f"{slug}: {titulo}" for slug, titulo in ARTIGOS_AJUDA.items() if slug != "central")
    return (
        "Procedimentos no app: quando o cliente perguntar como fazer algo no app (agendar, cancelar, bloquear, "
        "ajustar limite, exportar, configurar...), não explique o passo a passo nem cite menus ou botões. "
        "Responda em uma ou duas frases e inclua o link do artigo da Central de Ajuda exatamente no formato "
        "markdown [título](/ajuda/slug), usando apenas estes artigos (slug: título): "
        f"{catalogo}. Se nenhum servir, use [Central de Ajuda](/ajuda/central). "
        "Esses são os únicos links permitidos: nunca invente outro slug, nunca use links externos. "
        "Não repita o título fora do link. Ex.: O passo a passo está em "
        "[Como bloquear e desbloquear o cartão](/ajuda/cartao-bloqueio-temporario). "
    )


def limpar_links_ajuda(texto: str) -> str:
    """Links do catálogo ganham o título oficial; link para artigo desconhecido vira apenas o texto do título."""

    def trocar(m: re.Match) -> str:
        slug = m.group(3)
        return f"[{ARTIGOS_AJUDA[slug]}](/ajuda/{slug})" if slug in ARTIGOS_AJUDA else m.group(1)

    return _LINK_AJUDA.sub(trocar, texto)
