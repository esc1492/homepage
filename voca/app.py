import streamlit as st
import pandas as pd
from auth import get_credentials, logout
from sheets import read_sheet, write_sheet, append_row, delete_row, get_sheet_list, create_worksheet

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
tab_view, tab_append, tab_study = st.tabs(["📝 편집", "➕ 행 추가", "📚 학습"])

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
                cols[0], disabled=not hide_left, width="large"
            )
            if hide_left:
                mask = df_display[" "] == True
                df_display.loc[mask, cols[0]] = ""
        if len(cols) > 1:
            column_config[cols[1]] = st.column_config.TextColumn(
                cols[1], disabled=not hide_right, width="large"
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
