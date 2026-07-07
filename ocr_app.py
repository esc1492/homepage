import streamlit as st
import json
import uuid
import time
import base64
import io
import os
import html as html_mod
import urllib.request
import urllib.error
from PIL import Image, ImageOps

try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATE = True
except ImportError:
    HAS_TRANSLATE = False

try:
    import fitz  # pymupdf
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

# ── Config ────────────────────────────────────────
OCR_URL = os.environ.get("OCR_INVOKE_URL", "")
OCR_SECRET = os.environ.get("OCR_SECRET_KEY", "")

st.set_page_config(
    page_title="OCR 텍스트 추출",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Header ────────────────────────────────────────
st.markdown("""
<style>
    .block-container { padding-top: 3rem; }
</style>
""", unsafe_allow_html=True)
st.markdown("### 🔍 OCR 텍스트 추출")

# ── File Upload (with callback to clear previous result) ──
def on_file_change():
    st.session_state.pop("_ocr_text", None)
    st.session_state.pop("_translated", None)

uploaded_file = st.file_uploader(
    "파일 선택",
    type=["jpg", "jpeg", "png", "pdf"],
    label_visibility="collapsed",
    on_change=on_file_change,
)

if uploaded_file is None:
    st.stop()

# ── Prepare Image Data ────────────────────────────
file_bytes = uploaded_file.getvalue()

if uploaded_file.type == "application/pdf":
    if not HAS_PDF:
        st.error("PDF 처리를 위해 pymupdf 라이브러리가 필요합니다.")
        st.stop()
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    if len(doc) == 0:
        st.error("PDF에 페이지가 없습니다.")
        st.stop()
    page = doc[0]
    pix = page.get_pixmap(dpi=200)
    img_bytes_for_api = pix.tobytes("png")
    api_format = "png"
    display_img = img_bytes_for_api
else:
    img = Image.open(io.BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_bytes_for_api = buf.getvalue()
    api_format = "png"
    display_img = img_bytes_for_api

# ── Two-Column Layout ─────────────────────────────
col_left, col_right = st.columns(2)

with col_left:
    st.caption(f"📄 **{uploaded_file.name}**")
    with st.container(border=True):
        st.image(display_img, use_container_width=True)

with col_right:
    do_ocr = st.button("🔍 텍스트 추출", type="secondary", use_container_width=True)

    if do_ocr:
        with st.spinner("OCR 처리 중입니다..."):

            img_b64 = base64.b64encode(img_bytes_for_api).decode("utf-8")

            request_body = {
                "version": "V2",
                "requestId": str(uuid.uuid4()),
                "timestamp": int(time.time() * 1000),
                "images": [
                    {
                        "format": api_format,
                        "name": uploaded_file.name,
                        "data": img_b64,
                    }
                ],
            }

            req = urllib.request.Request(OCR_URL)
            req.add_header("Content-Type", "application/json")
            req.add_header("X-OCR-SECRET", OCR_SECRET)

            try:
                req_data = json.dumps(request_body).encode("utf-8")
                with urllib.request.urlopen(req, data=req_data, timeout=30) as resp:
                    result = json.loads(resp.read().decode("utf-8"))

                images = result.get("images", [])
                if not images:
                    st.error("OCR 결과가 비어 있습니다.")
                    st.stop()

                img_result = images[0]

                if img_result.get("inferResult") == "ERROR":
                    st.error(f"OCR 인식 실패: {img_result.get('message', '알 수 없는 오류')}")
                    st.stop()

                fields = img_result.get("fields", [])
                if not fields:
                    st.warning("인식된 텍스트가 없습니다.")
                    st.session_state["_ocr_text"] = ""
                else:
                    # Group fields by vertical overlap — pairwise comparison
                    def get_y_range(field):
                        v = field.get("boundingPoly", {}).get("vertices", [])
                        if not v:
                            return (0, 0)
                        ys = [p.get("y", 0) for p in v]
                        return (min(ys), max(ys))

                    lines = []
                    current_line = []
                    prev_top = prev_bottom = 0

                    for field in fields:
                        text = field.get("inferText", "")
                        if not text:
                            continue

                        ftop, fbottom = get_y_range(field)
                        fheight = fbottom - ftop

                        if not current_line:
                            current_line = [text]
                            prev_top, prev_bottom = ftop, fbottom
                        else:
                            overlap_top = max(prev_top, ftop)
                            overlap_bottom = min(prev_bottom, fbottom)
                            overlap = max(0, overlap_bottom - overlap_top)
                            prev_h = prev_bottom - prev_top
                            min_h = min(prev_h, fheight) if prev_h > 0 and fheight > 0 else 0
                            if min_h > 0 and overlap > min_h * 0.25:
                                current_line.append(text)
                                prev_top, prev_bottom = ftop, fbottom
                            else:
                                lines.append(" ".join(current_line))
                                current_line = [text]
                                prev_top, prev_bottom = ftop, fbottom

                    if current_line:
                        lines.append(" ".join(current_line))

                    extracted_text = "\n".join(lines)
                    st.session_state["_ocr_text"] = extracted_text

            except urllib.error.HTTPError as e:
                error_body = ""
                try:
                    error_body = e.read().decode("utf-8")[:200]
                except Exception:
                    pass
                st.error(f"OCR API 오류 (HTTP {e.code}): {error_body or e.reason}")
            except urllib.error.URLError as e:
                st.error(f"네트워크 오류: {e.reason}")
            except Exception as e:
                st.error(f"오류가 발생했습니다: {e}")

    # ── Display Result (persists via session state) ──
    if "_ocr_text" in st.session_state:
        text = st.session_state["_ocr_text"]
        if text:
            # ── Handle translation ──
            if st.session_state.pop("_trig_translate", False):
                if "_translated" in st.session_state:
                    # Toggle: show original
                    st.session_state.pop("_translated", None)
                else:
                    if HAS_TRANSLATE:
                        with st.spinner("번역 중입니다..."):
                            try:
                                korean_chars = sum(1 for c in text if '가' <= c <= '힯')
                                src = "ko" if korean_chars > len(text) * 0.3 else "en"
                                tgt = "en" if src == "ko" else "ko"
                                translated = GoogleTranslator(source=src, target=tgt).translate(text)
                                st.session_state["_translated"] = translated
                            except Exception as e:
                                st.session_state["_translated"] = f"(번역 오류: {e})"
                    else:
                        st.session_state["_translated"] = "(deep-translator 라이브러리가 필요합니다)"

            display_text = st.session_state.get("_translated", text)
            show_original = "_translated" in st.session_state
            label = "번역 결과" if show_original else "추출된 텍스트"
            trans_label = "🔤 원문" if show_original else "🌐 번역"
            safe_name = html_mod.escape(uploaded_file.name.rsplit(".", 1)[0])

            # ── Row 1: label + copy area (right-aligned) ──
            col_label, col_copy = st.columns([5, 0.7])
            with col_label:
                st.caption(f"{label}:")
            with col_copy:
                st.text_area(" ", display_text, height=68, label_visibility="collapsed", key=f"cp_{show_original}")

            st.markdown('<hr style="margin:4px 0 10px;border:none;border-top:1px solid #d1d5db;">',
                        unsafe_allow_html=True)
            st.code(display_text, language=None, line_numbers=False)

            # ── Row 2: download + translate below text ──
            col_dl, col_trans = st.columns([0.9, 0.9])
            with col_dl:
                st.download_button("⬇️ 다운로드", display_text, f"{safe_name}.txt", "text/plain",
                                   use_container_width=True, key="dl")
            with col_trans:
                if st.button(trans_label, key="trans", use_container_width=True):
                    st.session_state["_trig_translate"] = True
                    st.rerun()

        else:
            st.info("인식된 텍스트가 없습니다.")
    elif "_ocr_text" not in st.session_state:
        pass
