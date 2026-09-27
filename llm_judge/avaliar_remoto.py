"""Roda a base de ouro contra o agente publicado: métricas, concordância com o prompt local e latência.

    uv run python avaliar_remoto.py
"""

import asyncio
import json
import statistics
import time

from cliente import ClienteJuizTom
from juiz import dataset
from juiz.config import get_settings
from juiz.direto import JuizDireto
from juiz.metrica import avaliar
from juiz_tom.agent import carregar_prompt


async def main() -> None:
    s = get_settings()
    base = dataset.exemplos()
    remoto = ClienteJuizTom()
    latencias: list[float] = []

    async def cronometrar(ex):
        t = time.perf_counter()
        try:
            return await remoto.julgar(ex.mensagem, ex.cenario)
        except Exception as e:
            print(f"{ex.id}: erro remoto {e!r}")
            return None
        finally:
            latencias.append(time.perf_counter() - t)

    sem = asyncio.Semaphore(4)

    async def limitado(ex):
        async with sem:
            return await cronometrar(ex)

    vereditos_remotos = await asyncio.gather(*(limitado(e) for e in base))
    vereditos_locais = await JuizDireto(carregar_prompt()).julgar_lote([(e.mensagem, e.cenario) for e in base])

    r_remoto = avaliar(list(zip(base, vereditos_remotos)))
    r_local = avaliar(list(zip(base, vereditos_locais)))
    pares = [(a, b) for a, b in zip(vereditos_remotos, vereditos_locais) if a and b]
    concordancia = sum(a.aprovado == b.aprovado for a, b in pares) / len(pares) if pares else 0.0
    latencias.sort()
    saida = {
        "remoto": r_remoto.resumo(),
        "local": r_local.resumo(),
        "concordancia_aprovacao_remoto_x_local": round(concordancia, 3),
        "latencia_s": {
            "p50": round(statistics.median(latencias), 2),
            "p95": round(latencias[int(0.95 * (len(latencias) - 1))], 2),
            "max": round(latencias[-1], 2),
        },
        "erros_remoto": [e["id"] for e in r_remoto.erros],
    }
    (s.artefatos / "avaliacao_remota.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(saida, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
