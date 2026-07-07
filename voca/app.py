import json
import os
import streamlit as st
import pandas as pd
from auth import get_credentials, logout
from sheets import read_sheet, write_sheet, append_row, delete_row, get_sheet_list, create_worksheet
from openai import OpenAI

st.set_page_config(page_title="English Vocabulary Study", page_icon="📖", layout="wide", initial_sidebar_state="collapsed")

st.markdown("### 📖 English Vocabulary Study")

# ── 서비스 계정 인증 (자동, 사용자 액션 없음) ────────
creds = get_credentials()

if not creds:
    st.error("서비스 계정 인증에 실패했습니다. 관리자에게 문의하세요.")
    st.stop()

# ── 시트 URL 입력 ─────────────────────────────────
with st.sidebar:
    st.header("시트 설정")
    sheet_url = st.text_input(
        "Google Sheets URL",
        value="https://docs.google.com/spreadsheets/d/1ZWF6z7gYS88_ru6b9aBkbopEsDSbIbm3sE1Kx9mTL98/edit?usp=sharing",
        placeholder="https://docs.google.com/spreadsheets/d/...",
    )
    MODE_CUSTOM = "✏️ 직접 입력"

    if "_switch_to_sheet" in st.session_state:
        st.session_state["_ws_select"] = MODE_CUSTOM
        st.session_state["_ws_custom"] = st.session_state.pop("_switch_to_sheet")

    sheet_names = get_sheet_list(creds, sheet_url) if sheet_url else []

    if (st.session_state.get("_ws_select") == MODE_CUSTOM
            and st.session_state.get("_ws_custom", "").strip() in sheet_names):
        st.session_state["_ws_select"] = st.session_state["_ws_custom"].strip()

    if "_ws_current" not in st.session_state:
        st.session_state["_ws_current"] = "시트1"
    if "_ws_custom" not in st.session_state:
        st.session_state["_ws_custom"] = ""
    if "_ws_select" not in st.session_state:
        cur = st.session_state["_ws_current"]
        st.session_state["_ws_select"] = cur if cur in sheet_names else MODE_CUSTOM

    options = [MODE_CUSTOM] + sheet_names
    selected = st.selectbox("워크시트 이름", options=options, key="_ws_select")

    if selected == MODE_CUSTOM:
        st.text_input("워크시트 이름 입력", key="_ws_custom", placeholder="시트 이름을 입력하세요")
        custom_val = st.session_state["_ws_custom"].strip()
        worksheet_name = custom_val if custom_val else st.session_state["_ws_current"]
    else:
        worksheet_name = selected

    st.session_state["_ws_current"] = worksheet_name

    with st.expander("시트 관리"):
        if sheet_names:
            st.caption(f"현재 시트: {', '.join(sheet_names)}")

        new_sheet_name = st.text_input("새 시트 이름", placeholder="시트2", key="new_sheet")
        if st.button("➕ 새 시트 생성", use_container_width=True):
            if new_sheet_name.strip():
                if new_sheet_name.strip() in sheet_names:
                    st.warning(f"'{new_sheet_name}' 시트가 이미 존재합니다.")
                else:
                    headers = None
                    df_source = read_sheet(creds, sheet_url, "시트1")
                    if df_source is not None and len(df_source.columns) > 0:
                        headers = df_source.columns.tolist()

                    ok = create_worksheet(creds, sheet_url, new_sheet_name.strip(), headers=headers)
                    if ok:
                        st.success(f"'{new_sheet_name}' 시트가 생성되었습니다.")
                        st.session_state["_switch_to_sheet"] = new_sheet_name.strip()
                        st.cache_data.clear()
                        st.rerun()
            else:
                st.warning("시트 이름을 입력해주세요.")

if not sheet_url:
    st.warning("사이드바에서 Google Sheets URL을 입력해주세요.")
    st.stop()

# ── 탭 구성 ───────────────────────────────────────
tab_view, tab_append, tab_study, tab_chatbot = st.tabs(["📝 편집", "➕ 행 추가", "📚 학습", "🤖 텍스트 가져오기"])

# ── 탭 1: 데이터 보기 ─────────────────────────────
with tab_view:
    if st.button("🔄 새로고침", key="refresh"):
        st.cache_data.clear()

    with st.spinner("시트 데이터 불러오는 중..."):
        df = read_sheet(creds, sheet_url, worksheet_name)

    if df is not None and len(df.columns) > 0:
        if not df.empty:
            st.write(f"**{len(df)}행 × {len(df.columns)}열**")

        row_h = 35
        hdr_h = 38
        nrows = max(len(df), 1)
        edit_height = min(hdr_h + nrows * row_h, 800)

        edited_df = st.data_editor(
            df,
            use_container_width=True,
            height=edit_height,
            key="data_editor",
            num_rows="fixed",
        )

        if not df.empty:
            col_csv, _, col_save = st.columns([2, 8, 1.2])
            with col_csv:
                csv = df.to_csv(index=False).encode("utf-8-sig")
                st.download_button("⬇️ CSV 다운로드", csv, "data.csv", "text/csv")
            with col_save:
                if st.button("💾 저장", use_container_width=True):
                    changes = 0
                    for row_idx in range(len(df)):
                        for col_idx in range(len(df.columns)):
                            old_val = df.iloc[row_idx, col_idx]
                            new_val = edited_df.iloc[row_idx, col_idx]
                            if pd.isna(old_val) and pd.isna(new_val):
                                continue
                            if old_val != new_val:
                                sheet_row = row_idx + 2
                                sheet_col = col_idx + 1
                                val = "" if pd.isna(new_val) else str(new_val)
                                write_sheet(creds, sheet_url, worksheet_name, sheet_row, sheet_col, val)
                                changes += 1
                    if changes > 0:
                        st.cache_data.clear()

    else:
        st.info("시트를 불러올 수 없습니다.")

# ── 탭 2: 행 추가 ────────────────────────────────
with tab_append:
    st.subheader("새 행 추가")

    df_append = read_sheet(creds, sheet_url, worksheet_name)

    if df_append is not None and len(df_append.columns) > 0:
        row_h = 35
        hdr_h = 38
        nrows = max(len(df_append), 1)
        table_height = min(hdr_h + nrows * row_h, 800)

        edited_append = st.data_editor(
            df_append,
            use_container_width=True,
            height=table_height,
            key="append_editor",
            num_rows="dynamic",
            hide_index=False,
        )

        if st.button("💾 저장", use_container_width=True, key="save_append"):
            orig_idx = set(df_append.index)
            edit_idx = set(edited_append.index)

            deleted = orig_idx - edit_idx
            added = edit_idx - orig_idx

            if deleted:
                for idx in sorted(deleted, reverse=True):
                    delete_row(creds, sheet_url, worksheet_name, idx + 2)

            if added:
                for idx in added:
                    row_values = [
                        "" if pd.isna(edited_append.loc[idx, c])
                        else str(edited_append.loc[idx, c])
                        for c in range(len(df_append.columns))
                    ]
                    append_row(creds, sheet_url, worksheet_name, row_values)

            if deleted or added:
                st.cache_data.clear()
    else:
        st.info("데이터를 불러올 수 없습니다.")

# ── 탭 3: 학습 ────────────────────────────────────
with tab_study:
    st.subheader("단어 학습")

    df_study = read_sheet(creds, sheet_url, worksheet_name)

    if df_study is not None and len(df_study.columns) > 0:
        cols = df_study.columns.tolist()

        col_left, col_right = st.columns(2)
        with col_left:
            hide_left = st.checkbox(f"**{cols[0]}** 가리기", value=False)
        with col_right:
            _, cb_center, _ = st.columns([1, 2, 1])
            with cb_center:
                hide_right = st.checkbox("**한글** 가리기", value=False) if len(cols) > 1 else None

        all_selected = len(st.session_state.get("_study_sel", set())) == len(df_study) and not df_study.empty
        btn_label = "⬜ 전체 해제" if all_selected else "✅ 전체 선택"
        if st.button(btn_label, key="_sel_toggle"):
            if all_selected:
                st.session_state["_study_sel"] = set()
            else:
                st.session_state["_study_sel"] = set(df_study.index) if not df_study.empty else set()
            st.session_state["_study_key"] = 1 - st.session_state.get("_study_key", 0)
            st.rerun()

        if "_study_sel" not in st.session_state:
            st.session_state["_study_sel"] = set()

        df_display = df_study.copy()
        df_display.insert(0, " ", False)

        for idx in df_display.index:
            if idx in st.session_state["_study_sel"]:
                df_display.loc[idx, " "] = True

        column_config = {
            " ": st.column_config.CheckboxColumn(" ", default=False, width=40),
        }

        if len(cols) > 0:
            column_config[cols[0]] = st.column_config.TextColumn(
                cols[0], disabled=not hide_left, width="small"
            )
            if hide_left:
                mask = df_display[" "] == True
                df_display.loc[mask, cols[0]] = ""
        if len(cols) > 1:
            column_config[cols[1]] = st.column_config.TextColumn(
                cols[1], disabled=not hide_right, width="small"
            )
            if hide_right:
                mask = df_display[" "] == True
                df_display.loc[mask, cols[1]] = ""

        row_h = 35
        hdr_h = 38
        nrows = max(len(df_display), 1)
        study_height = min(hdr_h + nrows * row_h, 800)

        edited_df = st.data_editor(
            df_display,
            column_config=column_config,
            use_container_width=True,
            height=study_height,
            key=f"s{st.session_state.get('_study_key', 0)}",
            hide_index=True,
            num_rows="dynamic",
        )

        new_sel = {i for i in edited_df.index if edited_df.loc[i, " "]}
        if new_sel != st.session_state["_study_sel"]:
            st.session_state["_study_sel"] = new_sel
            st.session_state["_study_key"] = 1 - st.session_state.get("_study_key", 0)
            st.rerun()
    else:
        st.info("데이터를 불러올 수 없습니다.")

# ── 탭 4: OCR 텍스트 가져오기 ──────────────────────
with tab_chatbot:
    st.subheader("OCR 텍스트에서 영단어 추출")

    # Debug: st.secrets에 어떤 키들이 있는지 확인
    secret_keys = list(st.secrets.keys()) if st.secrets else []

    api_key = None
    if "DEEPSEEK_API_KEY" in st.secrets:
        api_key = st.secrets["DEEPSEEK_API_KEY"]
    if not api_key:
        api_key = os.environ.get("DEEPSEEK_API_KEY")

    if not api_key:
        st.error(
            "DEEPSEEK_API_KEY가 설정되지 않았습니다.\n\n"
            "Streamlit Cloud: 대시보드 Settings → Secrets에 다음을 추가해주세요:\n"
            '```\nDEEPSEEK_API_KEY = "sk-..."\n```\n\n'
            "참고: 앱 재배포가 필요할 수 있습니다 (리부트)."
        )
        with st.expander("디버그: 현재 Secrets 키 목록"):
            if secret_keys:
                st.write(f"총 {len(secret_keys)}개 키: {', '.join(sorted(secret_keys))}")
            else:
                st.write("Secrets에 등록된 키가 없습니다.")
            st.write(f"DEEPSEEK_API_KEY 포함 여부: {'DEEPSEEK_API_KEY' in st.secrets}")
        st.stop()

    ocr_text = st.text_area(
        "OCR 텍스트 붙여넣기",
        height=200,
        placeholder="OCR로 추출한 영어 텍스트를 여기에 붙여넣으세요...",
        value=st.session_state.get("_chatbot_ocr", ""),
    )

    if st.button("🤖 단어 추출", type="primary", use_container_width=True):
        if not ocr_text.strip():
            st.warning("텍스트를 입력해주세요.")
        else:
            with st.spinner("DeepSeek가 단어를 분석 중입니다..."):
                client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
                system_prompt = (
                    "You are an English vocabulary extractor. Given OCR text, extract English words and phrases "
                    "that are worth studying for Korean learners.\n\n"
                    "Rules:\n"
                    "1. Extract individual words, idioms, and phrasal verbs that have educational value.\n"
                    "2. Filter out basic stop words (the, a, an, is, are, was, were, be, been, have, has, had, do, does, did, will, would, can, could, may, might, shall, should, it, they, we, you, he, she, I, me, him, her, us, them, my, your, his, our, their, this, that, these, those, in, on, at, to, for, of, from, by, with, about, as, into, through, during, before, after, above, below, between, under, again, then, than, so, if, but, or, and, not, no, nor, yet, both, either, neither, each, every, all, any, few, more, most, other, some, such, only, own, same, very, just, because, as, until, while).\n"
                    "3. For idioms and phrasal verbs, include the full phrase (e.g., 'look up to', 'break down').\n"
                    "4. Provide accurate, natural Korean translations.\n"
                    "5. If a word appears in multiple forms (run, ran, running), use the base form.\n"
                    "6. Output ONLY a valid JSON array of objects. No markdown, no code fences, no explanation.\n\n"
                    'Output format:\n[{"english": "word or phrase", "korean": "한국어 번역"}, ...]'
                )

                try:
                    response = client.chat.completions.create(
                        model="deepseek-v4-flash",
                        max_tokens=4096,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Extract English vocabulary from this text and provide Korean translations:\n\n{ocr_text}"},
                        ],
                    )

                    raw = response.choices[0].message.content
                    cleaned = raw.strip()
                    if "```json" in cleaned:
                        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                    elif "```" in cleaned:
                        cleaned = cleaned.split("```")[1].split("```")[0].strip()

                    vocab_list = json.loads(cleaned)

                    if not isinstance(vocab_list, list) or len(vocab_list) == 0:
                        st.warning("추출된 단어가 없습니다. 텍스트에 학습할 만한 영어 단어가 있는지 확인해주세요.")
                    else:
                        st.session_state["_chatbot_vocab"] = vocab_list
                        st.session_state["_chatbot_ocr"] = ocr_text
                        st.success(f"{len(vocab_list)}개 단어를 추출했습니다.")
                        st.rerun()

                except json.JSONDecodeError:
                    st.error("DeepSeek 응답을 파싱하는 데 실패했습니다. 다시 시도해주세요.")
                    with st.expander("원본 응답 보기"):
                        st.code(raw)
                except Exception as e:
                    st.error(f"API 오류: {type(e).__name__}: {e}")

    st.divider()

    if "_chatbot_vocab" in st.session_state and st.session_state["_chatbot_vocab"]:
        vocab_list = st.session_state["_chatbot_vocab"]
        df_vocab = pd.DataFrame(vocab_list)

        if "english" not in df_vocab.columns:
            df_vocab["english"] = ""
        if "korean" not in df_vocab.columns:
            df_vocab["korean"] = ""

        st.subheader(f"추출된 단어 ({len(df_vocab)}개)")
        st.caption("필요에 따라 단어를 추가/수정/삭제한 후 아래에서 저장하세요.")

        edited_df = st.data_editor(
            df_vocab[["english", "korean"]],
            use_container_width=True,
            num_rows="dynamic",
            key="chatbot_editor",
            column_config={
                "english": st.column_config.TextColumn("English", width="medium"),
                "korean": st.column_config.TextColumn("한국어", width="medium"),
            },
            hide_index=False,
        )

        st.divider()
        st.subheader("새 워크시트에 저장")

        col_name, col_btn = st.columns([3, 1])
        with col_name:
            new_ws_name = st.text_input(
                "워크시트 이름",
                placeholder="예: Chapter 1 단어",
                key="chatbot_new_ws",
            )
        with col_btn:
            save_clicked = st.button("💾 저장", type="primary", use_container_width=True)

        if save_clicked:
            ws_name = new_ws_name.strip()
            if not ws_name:
                st.warning("워크시트 이름을 입력해주세요.")
            else:
                existing = get_sheet_list(creds, sheet_url)
                if ws_name in existing:
                    st.warning(f"'{ws_name}' 시트가 이미 존재합니다. 다른 이름을 사용해주세요.")
                else:
                    ok = create_worksheet(
                        creds, sheet_url, ws_name,
                        headers=["English", "Korean"],
                    )
                    if ok:
                        saved_count = 0
                        for _, row in edited_df.iterrows():
                            eng = "" if pd.isna(row.get("english")) else str(row["english"])
                            kor = "" if pd.isna(row.get("korean")) else str(row["korean"])
                            if eng.strip() or kor.strip():
                                append_row(creds, sheet_url, ws_name, [eng, kor])
                                saved_count += 1

                        st.success(f"'{ws_name}' 시트에 {saved_count}개 단어가 저장되었습니다.")
                        st.balloons()
                        st.cache_data.clear()

                        for key in ["_chatbot_vocab", "_chatbot_ocr"]:
                            if key in st.session_state:
                                del st.session_state[key]
                        st.rerun()
    else:
        st.info("OCR 텍스트를 붙여넣고 '단어 추출' 버튼을 눌러주세요.")
