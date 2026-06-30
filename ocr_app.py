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
    do_ocr = st.button("🔍 텍스트 추출", type="primary", use_container_width=True)

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
                    # API returns fields in reading order — preserve it
                    lines = []
                    current_line = []
                    current_y = None
                    Y_THRESHOLD = 30  # pixels; same-line tolerance

                    for field in fields:
                        v = field.get("boundingPoly", {}).get("vertices", [])
                        if not v:
                            continue
                        # Use center Y of the bounding box
                        ys = [p.get("y", 0) for p in v]
                        cy = sum(ys) / len(ys)
                        text = field.get("inferText", "")

                        if current_y is None:
                            current_line = [text]
                            current_y = cy
                        elif abs(cy - current_y) <= Y_THRESHOLD:
                            current_line.append(text)
                        else:
                            if current_line:
                                lines.append(" ".join(current_line))
                            current_line = [text]
                            current_y = cy

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
            do_translate = st.query_params.get("translate") == "1"
            if do_translate and "_translated" not in st.session_state:
                st.query_params.pop("translate", None)
                if HAS_TRANSLATE:
                    with st.spinner("번역 중입니다..."):
                        try:
                            # Auto-detect: Korean ↔ English
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

            # ── Button row: copy / download / translate ──
            safe_name = html_mod.escape(uploaded_file.name.rsplit(".", 1)[0])
            # For JS embedding: escape backslash, backtick, and dollar signs
            js_text = display_text.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
            label = "번역 결과" if show_original else "추출된 텍스트"
            trans_label = "🔤 원문 보기" if show_original else "🌐 번역"
            trans_url = "?translate=1"

            st.components.html(f"""
<style>
.ocr-bar {{ display:flex; align-items:center; justify-content:space-between; }}
.ocr-bar .label {{ color:#9ca3af; font-size:13px; white-space:nowrap; }}
.ocr-bar .btn-group {{ display:flex; gap:2px; }}
.ocr-bar .btn {{ background:none; border:none; color:#9ca3af; cursor:pointer; font-size:13px; padding:5px 10px; border-radius:4px; white-space:nowrap; text-decoration:none; display:inline-flex; align-items:center; }}
.ocr-bar .btn:hover {{ color:#f3f4f6; background:rgba(255,255,255,0.08); }}
.ocr-divider {{ border:none; border-top:1px solid #333; margin:8px 0 12px; }}
pre#_ocr {{ display:none; }}
</style>
<div class="ocr-bar">
  <span class="label">{label}:</span>
  <span class="btn-group">
    <button class="btn" onclick="(function(){{var t=document.getElementById('_ocr').textContent;navigator.clipboard.writeText(t).then(function(){{var b=document.getElementById('_cp');b.innerHTML='&#9989; 복사됨';setTimeout(function(){{b.innerHTML='&#128203; 복사';}},1200);}});}})();return false;" id="_cp">📋 복사</button>
    <button class="btn" onclick="(function(){{var t=document.getElementById('_ocr').textContent;var b=new Blob([t],{{type:'text/plain'}});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='{safe_name}.txt';a.click();URL.revokeObjectURL(u);}})();return false;">⬇️ 다운로드</button>
    <a class="btn" href="{trans_url}">{trans_label}</a>
  </span>
</div>
<hr class="ocr-divider">
<pre id="_ocr">{html_mod.escape(display_text)}</pre>
""", height=250, scrolling=True)

        else:
            st.info("인식된 텍스트가 없습니다.")
    elif "_ocr_text" not in st.session_state:
        pass
