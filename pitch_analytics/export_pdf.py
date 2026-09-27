"""Script para exportação automatizada do Pitch Storytelling para PDF de alta fidelidade.

Gera duas versões do documento:
1. pitch_storytelling.pdf (Versão Completa — inclui código e análises)
2. pitch_storytelling_executivo.pdf (Versão Executiva — foca na narrativa, gráficos e tabelas)

Utiliza nbconvert para gerar HTML estilizado e o motor Chromium (Google Chrome)
para renderização com qualidade gráfica de impressão e vetores nítidos.
"""

from pathlib import Path
import re
import subprocess
import sys

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]

CUSTOM_PRINT_CSS = """
<style>
/* Estilos para exportação elegante em PDF */
@media print {
    @page {
        margin: 15mm 12mm 15mm 12mm;
        size: A4 portrait;
    }
    
    /* Ocultar avisos e logs de stderr do terminal (ex.: UserWarning de fontes) */
    [data-mime-type="application/vnd.jupyter.stderr"],
    .jp-RenderedText[data-mime-type="application/vnd.jupyter.stderr"] {
        display: none !important;
    }

    /* Evitar quebras de página no meio de gráficos, tabelas e cabeçalhos */
    .jp-Cell,
    .jp-OutputArea-child,
    figure,
    table,
    img {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
    }

    h1, h2, h3 {
        break-after: avoid !important;
        page-break-after: avoid !important;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        background-color: #ffffff !important;
    }
}
</style>
"""

def find_chrome():
    for p in CHROME_PATHS:
        if Path(p).exists():
            return p
    return None

def inject_print_css(html_path: Path):
    content = html_path.read_text(encoding="utf-8")
    if "</head>" in content:
        content = content.replace("</head>", f"{CUSTOM_PRINT_CSS}\n</head>", 1)
    else:
        content = f"{CUSTOM_PRINT_CSS}\n{content}"
    html_path.write_text(content, encoding="utf-8")

def export_to_pdf(html_path: Path, pdf_path: Path, chrome_bin: str):
    cmd = [
        chrome_bin,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path.resolve()}",
        str(html_path.resolve()),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Erro ao gerar {pdf_path}: {result.stderr}", file=sys.stderr)
        return False
    return True

def main():
    base_dir = Path(__file__).resolve().parent
    notebook_path = base_dir / "pitch_storytelling.ipynb"

    if not notebook_path.exists():
        print(f"Erro: Arquivo {notebook_path} não encontrado.", file=sys.stderr)
        sys.exit(1)

    chrome_bin = find_chrome()
    if not chrome_bin:
        print("Erro: Nenhum navegador Chromium/Chrome encontrado para renderizar PDF.", file=sys.stderr)
        sys.exit(1)

    print(f"Usando renderizador: {chrome_bin}")

    tasks = [
        {
            "name": "Versão Completa (com código e saídas)",
            "no_input": False,
            "html": base_dir / "pitch_storytelling.html",
            "pdf": base_dir / "pitch_storytelling.pdf",
        },
        {
            "name": "Versão Executiva (apenas narrativa, tabelas e gráficos)",
            "no_input": True,
            "html": base_dir / "pitch_storytelling_executivo.html",
            "pdf": base_dir / "pitch_storytelling_executivo.pdf",
        },
    ]

    for t in tasks:
        print(f"\nGerando {t['name']}...")
        nbconvert_cmd = [
            "uvx",
            "--from", "nbconvert",
            "jupyter-nbconvert",
            "--to", "html",
            str(notebook_path),
            "--output", t["html"].name,
        ]
        if t["no_input"]:
            nbconvert_cmd.append("--no-input")

        res_nb = subprocess.run(nbconvert_cmd, cwd=base_dir, capture_output=True, text=True)
        if res_nb.returncode != 0:
            print(f"Erro no nbconvert: {res_nb.stderr}", file=sys.stderr)
            continue

        inject_print_css(t["html"])
        ok = export_to_pdf(t["html"], t["pdf"], chrome_bin)
        if ok and t["pdf"].exists():
            size_mb = t["pdf"].stat().st_size / (1024 * 1024)
            print(f"✅ Gerado com sucesso: {t['pdf'].name} ({size_mb:.2f} MB)")
        else:
            print(f"❌ Falha ao exportar {t['pdf'].name}")

    print("\n✨ Exportação concluída com sucesso!")

if __name__ == "__main__":
    main()
