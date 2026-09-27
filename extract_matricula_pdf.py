#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_matricula_pdf.py
Módulo 1: Parser de PDF Pericial (Matrícula Digital e Edital)
- Extração vetorial com PyMuPDF descartando rotações != 0 e marcas d'água
- Detecção de necessidade de OCR (< 150 caracteres úteis ou ausência de termos-chave)
- Renderização a 300 DPI se OCR for necessário
- Captura estruturada de Número da Matrícula e Cartório Competente (RGI) via Regex
"""

import sys
import os
import json
import base64
import re
import unicodedata

# Node.js consumes this process as UTF-8. Windows may default stdout to CP1252,
# which fails on common registry glyphs and prevents returning the OCR result.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

# Termos de marca d'água a descartar
WATERMARK_TERMS = [
    "SIMPLES CONSULTA",
    "SEM VALOR DE CERTIDÃO",
    "SEM VALOR DE CERTIDAO",
    "VALIDAÇÃO ELETRÔNICA",
    "VALIDACAO ELETRONICA",
    "ASSINADO DIGITALMENTE",
    "VISUALIZAÇÃO DE MATRÍCULA",
    "VISUALIZACAO DE MATRICULA",
    "CÓDIGO DE CONTROLE",
    "CODIGO DE CONTROLE",
    "REGISTRADORES.ORG",
    "SELO DE FISCALIZACAO",
    "SELO DE FISCALIZAÇÃO"
]

# Termos-chave obrigatórios para conteúdo registral
KEY_REGISTRY_TERMS = [
    "MATRICULA",
    "MATRÍCULA",
    "LIVRO",
    "REGISTRO",
    "IMOVEL",
    "IMÓVEL"
]

# Regex para Número da Matrícula:
# r'(?i)matr[íi]cula\s*(?:n[ºo°\.\s]*)?(\d{1,8})' ou r'(?i)n[ºo°\s]*(\d{1,8})\s*(?:livro|fls|ficha)'
RE_MATRICULA_1 = re.compile(r'(?i)matr[íi]cula\s*(?:n[ºo°\.\s]*)?(\d{1,8})')
RE_MATRICULA_2 = re.compile(r'(?i)n[ºo°\s]*(\d{1,8})\s*(?:livro|fls|ficha)')

# Regex para Cartório Competente (RGI):
# r'(?i)((?:\d{1,2}[ºo°ª]?\s*)?(?:of[íi]cio|servi[çc]o|tabelionato|cart[óo]rio)\s*(?:de\s+|do\s+)?(?:registro|registral)\s+de\s+im[óo]veis(?:\s+da\s+comarca\s+de\s+[a-z\s]+)?)'
RE_CARTORIO = re.compile(
    r'(?i)((?:\d{1,2}[ºo°ª]?\s*)?(?:of[íi]cio|servi[çc]o|tabelionato|cart[óo]rio)\s*(?:de\s+|do\s+)?(?:registro|registral)\s+de\s+im[óo]veis(?:\s+da\s+comarca\s+de\s+[a-záàâãéèêíïóôõöúç\s]+)?)'
)

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return unicodedata.normalize('NFKD', text)

def is_watermark(text: str) -> bool:
    norm = normalize_text(text).upper()
    for wm in WATERMARK_TERMS:
        if normalize_text(wm).upper() in norm:
            return True
    return False

def count_useful_chars(text: str) -> int:
    letters = re.findall(r'[a-zA-Z0-9À-ÿ]', text)
    return len(letters)

def has_key_terms(text: str) -> bool:
    norm = normalize_text(text).upper()
    for term in KEY_REGISTRY_TERMS:
        norm_term = normalize_text(term).upper()
        if re.search(r'\b' + re.escape(norm_term) + r'\b', norm):
            return True
    return False

def extract_structured_fields(text: str):
    matricula_num = None
    m1 = RE_MATRICULA_1.search(text)
    if m1:
        matricula_num = m1.group(1).strip()
    else:
        m2 = RE_MATRICULA_2.search(text)
        if m2:
            matricula_num = m2.group(1).strip()

    cartorio_rgi = None
    c_m = RE_CARTORIO.search(text)
    if c_m:
        cartorio_rgi = c_m.group(1).strip()
        # Clean multiple spaces or trailing punctuation
        cartorio_rgi = re.sub(r'\s+', ' ', cartorio_rgi).strip(' -.,;')

    return matricula_num, cartorio_rgi

def process_pdf(data_bytes: bytes, max_pages: int = 12):
    if not fitz:
        return {
            "success": False,
            "error": "PyMuPDF não está instalado no ambiente Python."
        }

    try:
        doc = fitz.open(stream=data_bytes, filetype="pdf")
    except Exception as e:
        return {
            "success": False,
            "error": f"Falha ao abrir PDF com PyMuPDF: {str(e)}"
        }

    total_pages = len(doc)
    pages_to_process = min(total_pages, max_pages)

    clean_pages_text = []
    page_ocr_required = []
    images_300dpi = []

    for page_num in range(pages_to_process):
        page = doc[page_num]
        dict_data = page.get_text("dict")
        page_clean_blocks = []

        # Analisa blocos e linhas do PyMuPDF
        for b in dict_data.get("blocks", []):
            if "lines" not in b:
                continue

            block_text_lines = []
            block_is_rotated = False
            block_is_wm = False

            for line in b["lines"]:
                # Verifica rotação angular != 0 (horizontal é dir=(1.0, 0.0))
                dir_val = line.get("dir", (1.0, 0.0))
                if abs(dir_val[1]) > 0.02 or dir_val[0] < 0.95:
                    block_is_rotated = True
                    break

                line_str = "".join(span.get("text", "") for span in line.get("spans", []))
                if is_watermark(line_str):
                    block_is_wm = True
                    break
                block_text_lines.append(line_str)

            if block_is_rotated or block_is_wm:
                continue

            full_block_text = "\n".join(block_text_lines).strip()
            if full_block_text and not is_watermark(full_block_text):
                page_clean_blocks.append(full_block_text)

        page_text = "\n".join(page_clean_blocks).strip()
        useful_chars = count_useful_chars(page_text)
        has_terms = has_key_terms(page_text)

        # Regra do Fallback OCR:
        # Se texto limpo < 150 caracteres úteis OU se termos-chave não estiverem presentes:
        if useful_chars < 150 or not has_terms:
            page_ocr_required.append(page_num)
            # Renderiza página a 300 DPI
            try:
                pix = page.get_pixmap(dpi=300)
                img_png_bytes = pix.tobytes("png")
                images_300dpi.append({
                    "page": page_num + 1,
                    "base64": base64.b64encode(img_png_bytes).decode("ascii")
                })
            except Exception as render_err:
                pass
        else:
            clean_pages_text.append(f"--- PÁGINA {page_num + 1} ---\n" + page_text)

    consolidated_text = "\n\n".join(clean_pages_text).strip()
    needs_ocr = len(page_ocr_required) > 0 and (count_useful_chars(consolidated_text) < 150 or not has_key_terms(consolidated_text))

    mat_num, cart_rgi = extract_structured_fields(consolidated_text)

    return {
        "success": True,
        "totalPages": total_pages,
        "processedPages": pages_to_process,
        "cleanText": consolidated_text,
        "inteiro_teor": consolidated_text,
        "usefulChars": count_useful_chars(consolidated_text),
        "needsOcr": needs_ocr,
        "ocrPages": page_ocr_required,
        "matriculaNumero": mat_num,
        "cartorioRgi": cart_rgi,
        "images300Dpi": images_300dpi if needs_ocr else []
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--file":
        if len(sys.argv) < 3:
            print(json.dumps({"success": False, "error": "Caminho do arquivo não fornecido."}))
            sys.exit(1)
        file_path = sys.argv[2]
        if not os.path.exists(file_path):
            print(json.dumps({"success": False, "error": f"Arquivo não encontrado: {file_path}"}))
            sys.exit(1)
        with open(file_path, "rb") as f:
            data = f.read()
    else:
        # Lê do stdin (buffer binário)
        data = sys.stdin.buffer.read()

    if not data:
        print(json.dumps({"success": False, "error": "Nenhum dado PDF recebido."}))
        sys.exit(1)

    result = process_pdf(data)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
