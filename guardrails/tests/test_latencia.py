import statistics
import time

from app.regras import entrada, saida
from tests.test_entrada import ATAQUES_SLIDE, LEGITIMAS


def test_camada_deterministica_abaixo_de_10ms_p95():
    mensagens = [t for _, t in ATAQUES_SLIDE] + LEGITIMAS
    tempos = []
    for i in range(1000):
        m = mensagens[i % len(mensagens)]
        t0 = time.perf_counter()
        entrada.avaliar(m)
        saida.avaliar(m, m, {"x": 1})
        tempos.append((time.perf_counter() - t0) * 1000)
    p95 = statistics.quantiles(tempos, n=20)[18]
    assert p95 < 10, f"p95={p95:.2f} ms"
