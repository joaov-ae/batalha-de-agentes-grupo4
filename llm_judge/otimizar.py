"""Calibra o juiz de tom na base de ouro com DSPy (MIPROv2) + Gemini e exporta o prompt.

Uso (credenciais: ADC do projeto, ex. GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/adc-batalha.json):
    uv run python otimizar.py            # baseline + MIPROv2 + avaliação do prompt exportado
    uv run python otimizar.py --cv       # + validação cruzada 5-fold (roda o MIPROv2 5 vezes)

Saídas em artefatos/: juiz_tom_dspy.json, juiz_tom_prompt.json e relatorio.md.
"""

import argparse
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import dspy

from juiz import dataset, prompt
from juiz.assinatura import JulgarTom
from juiz.config import get_settings
from juiz.direto import JuizDireto
from juiz.metrica import Resultado, avaliar, pontuar

log = logging.getLogger("otimizar")
S = get_settings()


def _lm(modelo: str, **kw) -> dspy.LM:
    extra = {} if S.pensar or "pro" in modelo else {"reasoning_effort": "disable"}
    return dspy.LM(f"vertex_ai/{modelo}", vertex_project=S.projeto, vertex_location=S.regiao, **extra, **kw)


def rodar_dspy(programa: dspy.Module, exemplos: list[dspy.Example]) -> Resultado:
    def um(ex):
        try:
            return programa(**ex.inputs())
        except Exception as e:  # falha de parse ou de rede: conta como reprovação
            log.warning("%s falhou: %r", ex.id, e)
            return None

    with ThreadPoolExecutor(8) as pool:
        preds = list(pool.map(um, exemplos))
    return avaliar(list(zip(exemplos, preds)))


def rodar_direto(p: dict, exemplos: list[dspy.Example], pensar: bool | None = None) -> Resultado:
    juiz = JuizDireto(p, pensar=pensar)
    vereditos = asyncio.run(juiz.julgar_lote([(e.mensagem, e.cenario) for e in exemplos]))
    return avaliar(list(zip(exemplos, vereditos)))


def otimizar(treino: list[dspy.Example], seed: int = 9) -> dspy.Module:
    mipro = dspy.MIPROv2(
        metric=pontuar, prompt_model=_lm(S.modelo_prompt), auto="light", num_threads=8, seed=seed,
        max_bootstrapped_demos=4, max_labeled_demos=4,
    )
    # Base pequena: candidatos avaliados no próprio treino; a validação separada fica intocada para o relatório.
    return mipro.compile(
        dspy.Predict(JulgarTom), trainset=treino, valset=treino, minibatch=False, requires_permission_to_run=False,
    )


def exportar(programa: dspy.Module, metricas: dict) -> dict:
    pred = programa.predictors()[0]
    demos = []
    for d in pred.demos:
        justificativa = d.get("justificativa") or f"Avaliação humana: {d.get('comentario', '')}".strip()
        demos.append({
            "id": d.get("id"), "cenario": d["cenario"], "mensagem": d["mensagem"],
            "justificativa": justificativa, "nota": int(d["nota"]),
        })
    return {
        "instrucao": pred.signature.instructions,
        "demos": demos,
        "limiar_aprovacao": S.limiar_aprovacao,
        "modelo": S.modelo_juiz,
        "pensar": S.pensar,
        "metricas": metricas,
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def validacao_cruzada(base: list[dspy.Example], k: int = 5) -> dict:
    total = Resultado()
    for i, (tr, va) in enumerate(dataset.dobras(base, k)):
        log.info("fold %d/%d: treino=%d validação=%d", i + 1, k, len(tr), len(va))
        r = rodar_direto(exportar(otimizar(tr), {}), va)
        for campo in ("n", "vp", "vn", "fp", "fn", "soma_erro_nota", "falhas_parse"):
            setattr(total, campo, getattr(total, campo) + getattr(r, campo))
        total.erros += r.erros
    return total.resumo() | {"erros": [e["id"] for e in total.erros]}


def _linha(nome: str, r: dict) -> str:
    return (f"| {nome} | {r['n']} | {r['acuracia']:.0%} | {r['falsa_reprovacao']:.0%} | {r['falsa_aprovacao']:.0%} "
            f"| {r['mae_nota']:.2f} | {r['matriz']['vp']}/{r['matriz']['vn']}/{r['matriz']['fp']}/{r['matriz']['fn']} |")


def relatorio(linhas: dict[str, dict], erros: list[dict], p: dict, cv: dict | None) -> str:
    out = [
        "# Relatório — juiz de tom", "",
        f"Gerado em {p['gerado_em']} · modelo `{p['modelo']}` · thinking {'ligado' if p['pensar'] else 'desligado'} "
        f"· limiar de aprovação: nota ≥ {p['limiar_aprovacao']}", "",
        "| Configuração | n | Acurácia | Falsa reprovação | Falsa aprovação | MAE nota | VP/VN/FP/FN |",
        "|---|---|---|---|---|---|---|",
        *[_linha(k, v) for k, v in linhas.items()],
    ]
    if cv:
        out += ["", "## Validação cruzada 5-fold (MIPROv2 por dobra, prompt exportado)", "",
                "| Configuração | n | Acurácia | Falsa reprovação | Falsa aprovação | MAE nota | VP/VN/FP/FN |",
                "|---|---|---|---|---|---|---|", _linha("5-fold", cv), "",
                f"Erros: {', '.join(cv['erros']) or 'nenhum'}"]
    out += ["", "## Erros do prompt exportado na validação", ""]
    if not erros:
        out.append("Nenhum.")
    for e in erros:
        out += [f"- **{e['id']}** ({e['cenario']}): ouro {e['nota_ouro']}, juiz {e['nota_juiz']}. "
                f"Humano: _{e['comentario_humano']}_. Juiz: _{e['justificativa_juiz']}_",
                f"  > {e['mensagem']}"]
    out += ["", "## Prompt exportado", "", f"Demos: {', '.join(d['id'] or '?' for d in p['demos']) or 'nenhum'}", "",
            "```text", p["instrucao"], "```", ""]
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cv", action="store_true", help="validação cruzada 5-fold (lento)")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    logging.getLogger("LiteLLM").setLevel(logging.WARNING)

    dspy.configure(lm=_lm(S.modelo_juiz, temperature=0))
    base = dataset.exemplos()
    treino, val = dataset.dividir(base)
    log.info("base=%d treino=%d validação=%d", len(base), len(treino), len(val))

    linhas: dict[str, dict] = {}
    zero = prompt.padrao(S.limiar_aprovacao)
    linhas["Baseline zero-shot · validação"] = rodar_direto(zero, val).resumo()
    linhas["Baseline zero-shot · base inteira (47)"] = rodar_direto(zero, base).resumo()
    linhas["Baseline zero-shot + thinking · base inteira (47)"] = rodar_direto(zero, base, pensar=True).resumo()

    compilado = otimizar(treino)
    linhas["DSPy otimizado · validação"] = rodar_dspy(compilado, val).resumo()

    S.artefatos.mkdir(exist_ok=True)
    compilado.save(str(S.artefatos / "juiz_tom_dspy.json"))
    p = exportar(compilado, {})
    r_val = rodar_direto(p, val)
    linhas["Prompt exportado (vai pro ADK) · validação"] = r_val.resumo()
    linhas["Prompt exportado · base inteira (47, inclui treino)"] = rodar_direto(p, base).resumo()

    cv = validacao_cruzada(base) if args.cv else None
    p["metricas"] = {"validacao": linhas["Prompt exportado (vai pro ADK) · validação"]} | ({"cv_5fold": cv} if cv else {})
    S.prompt_json.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
    (S.artefatos / "relatorio.md").write_text(relatorio(linhas, r_val.erros, p, cv), encoding="utf-8")

    for k, v in linhas.items():
        print(f"{k:55s} acc={v['acuracia']:.0%} FR={v['falsa_reprovacao']:.0%} FA={v['falsa_aprovacao']:.0%} mae={v['mae_nota']:.2f}")
    if cv:
        print(f"{'CV 5-fold':55s} acc={cv['acuracia']:.0%} FR={cv['falsa_reprovacao']:.0%} FA={cv['falsa_aprovacao']:.0%}")


if __name__ == "__main__":
    main()
