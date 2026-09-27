"""Métrica de otimização (DSPy) e métricas do relatório."""

from dataclasses import dataclass, field

from juiz.contrato import aprovar
from juiz.config import get_settings

# Reprovar mensagem boa é o erro mais caro: o juiz deve pender para aprovar.
PENALIDADE_FALSA_REPROVACAO = 0.2


def _nota(pred) -> int | None:
    try:
        return int(pred.nota)
    except (TypeError, ValueError, AttributeError):
        return None


def pontuar(exemplo, pred, trace=None) -> float:
    nota = _nota(pred)
    if nota is None:
        return 0.0
    limiar = get_settings().limiar_aprovacao
    aprovado = aprovar(nota, limiar)
    acerto = aprovado == exemplo.aprovado
    score = 0.7 * acerto + 0.3 * (1 - abs(nota - exemplo.nota) / 4)
    if exemplo.aprovado and not aprovado:
        score -= PENALIDADE_FALSA_REPROVACAO
    score = max(score, 0.0)
    # Durante o bootstrap de demos, só aceita traces que acertam a aprovação e erram a nota por no máximo 1.
    if trace is not None:
        return float(acerto and abs(nota - exemplo.nota) <= 1)
    return score


@dataclass
class Resultado:
    n: int = 0
    vp: int = 0  # aprovou e era para aprovar
    vn: int = 0  # reprovou e era para reprovar
    fp: int = 0  # falsa aprovação
    fn: int = 0  # falsa reprovação
    soma_erro_nota: int = 0
    falhas_parse: int = 0
    erros: list[dict] = field(default_factory=list)

    @property
    def acuracia(self) -> float:
        return (self.vp + self.vn) / self.n if self.n else 0.0

    @property
    def taxa_falsa_reprovacao(self) -> float:
        """Das mensagens boas, quantas o juiz reprovou."""
        return self.fn / (self.vp + self.fn) if (self.vp + self.fn) else 0.0

    @property
    def taxa_falsa_aprovacao(self) -> float:
        """Das mensagens ruins, quantas o juiz aprovou."""
        return self.fp / (self.vn + self.fp) if (self.vn + self.fp) else 0.0

    @property
    def mae_nota(self) -> float:
        validas = self.n - self.falhas_parse
        return self.soma_erro_nota / validas if validas else 0.0

    def resumo(self) -> dict:
        return {
            "n": self.n,
            "acuracia": round(self.acuracia, 3),
            "falsa_reprovacao": round(self.taxa_falsa_reprovacao, 3),
            "falsa_aprovacao": round(self.taxa_falsa_aprovacao, 3),
            "mae_nota": round(self.mae_nota, 3),
            "matriz": {"vp": self.vp, "vn": self.vn, "fp": self.fp, "fn": self.fn},
            "falhas_parse": self.falhas_parse,
        }


def avaliar(pares: list[tuple], limiar: int | None = None) -> Resultado:
    """pares: [(exemplo, pred | VereditoTom | None)]."""
    limiar = limiar or get_settings().limiar_aprovacao
    r = Resultado()
    for ex, pred in pares:
        r.n += 1
        nota = _nota(pred) if pred is not None else None
        if nota is None:
            # Falha de parse conta como reprovação (o pior caso para um juiz que deve aprovar mais).
            r.falhas_parse += 1
            aprovado = False
        else:
            aprovado = aprovar(nota, limiar)
            r.soma_erro_nota += abs(nota - ex.nota)
        if aprovado and ex.aprovado:
            r.vp += 1
        elif not aprovado and not ex.aprovado:
            r.vn += 1
        elif aprovado:
            r.fp += 1
        else:
            r.fn += 1
        if aprovado != ex.aprovado:
            r.erros.append({
                "id": ex.id, "cenario": ex.cenario, "mensagem": ex.mensagem, "nota_ouro": ex.nota, "nota_juiz": nota,
                "comentario_humano": ex.comentario, "justificativa_juiz": getattr(pred, "justificativa", None),
            })
    return r
