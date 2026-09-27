"""Assinatura DSPy do juiz de tom (usada só na otimização)."""

from typing import Literal

import dspy

from juiz.contrato import CRITERIOS, VereditoTom, aprovar  # noqa: F401  (reexportados)

Nota = Literal[1, 2, 3, 4, 5]


class JulgarTom(dspy.Signature):
    __doc__ = CRITERIOS

    cenario: str = dspy.InputField(desc="momento da jornada em que a mensagem é enviada")
    mensagem: str = dspy.InputField(desc="texto enviado ao cliente, com os botões entre colchetes")
    justificativa: str = dspy.OutputField(desc="1 ou 2 frases sobre o tom, antes da nota")
    nota: Nota = dspy.OutputField(desc="1 a 5, conforme os critérios")
