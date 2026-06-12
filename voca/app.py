import streamlit as st
import pandas as pd
from auth import get_credentials, logout
from sheets import read_sheet, write_sheet, append_row, get_sheet_list

st.set_page_config(page_title="Google Sheets Manager", page_icon="📊", layout="wide")

st.title("📊 Google Sheets Manager")

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
        value="https://docs.google.com/spreadsheets/d/1vuj_GBNSx5b4F-P5N3GUQ8pTJYXkrGS4IpnUd45q_qk/edit?usp=sharing",
        placeholder="https://docs.google.com/spreadsheets/d/...",
    )
    worksheet_name = st.text_input("워크시트 이름", value="todos")

if not sheet_url:
    st.warning("사이드바에서 Google Sheets URL을 입력해주세요.")
    st.stop()

# ── 탭 구성 ───────────────────────────────────────
tab_view, tab_edit, tab_append = st.tabs(["📋 데이터 보기", "✏️ 셀 수정", "➕ 행 추가"])

# ── 탭 1: 데이터 보기 ─────────────────────────────
with tab_view:
    if st.button("🔄 새로고침", key="refresh"):
        st.cache_data.clear()

    with st.spinner("시트 데이터 불러오는 중..."):
        df = read_sheet(creds, sheet_url, worksheet_name)

    if df is not None and not df.empty:
        st.write(f"**{len(df)}행 × {len(df.columns)}열**")
        st.dataframe(df, use_container_width=True, height=400)

        csv = df.to_csv(index=False).encode("utf-8-sig")
        st.download_button("⬇️ CSV 다운로드", csv, "data.csv", "text/csv")
    else:
        st.info("데이터가 없거나 시트를 불러올 수 없습니다.")

# ── 탭 2: 셀 수정 ────────────────────────────────
with tab_edit:
    st.subheader("셀 값 수정")

    df_edit = read_sheet(creds, sheet_url, worksheet_name)

    if df_edit is not None and not df_edit.empty:
        col1, col2, col3 = st.columns(3)
        with col1:
            row_num = st.number_input("행 번호 (1=헤더 다음 첫 행)", min_value=1, max_value=len(df_edit), value=1)
        with col2:
            col_name = st.selectbox("열 선택", df_edit.columns.tolist())
        with col3:
            col_idx = df_edit.columns.tolist().index(col_name) + 1
            current_val = str(df_edit.iloc[row_num - 1][col_name])
            new_value = st.text_input("새 값", value=current_val)

        if st.button("💾 저장", key="save_cell"):
            sheet_row = row_num + 1
            success = write_sheet(creds, sheet_url, worksheet_name, sheet_row, col_idx, new_value)
            if success:
                st.success(f"✅ {row_num}행 '{col_name}' → '{new_value}' 저장 완료")
                st.cache_data.clear()
            else:
                st.error("저장 실패. 시트 접근 권한을 확인해주세요.")
    else:
        st.info("수정할 데이터가 없습니다.")

# ── 탭 3: 행 추가 ────────────────────────────────
with tab_append:
    st.subheader("새 행 추가")

    df_append = read_sheet(creds, sheet_url, worksheet_name)

    if df_append is not None:
        new_row = {}
        cols = st.columns(min(len(df_append.columns), 4))
        for i, col in enumerate(df_append.columns):
            with cols[i % 4]:
                new_row[col] = st.text_input(col, key=f"new_{col}")

        if st.button("➕ 행 추가", key="add_row"):
            row_values = list(new_row.values())
            success = append_row(creds, sheet_url, worksheet_name, row_values)
            if success:
                st.success("✅ 새 행이 추가되었습니다.")
                st.cache_data.clear()
            else:
                st.error("추가 실패. 시트 접근 권한을 확인해주세요.")
    else:
        st.info("시트를 먼저 불러와주세요.")
