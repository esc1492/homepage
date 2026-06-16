import streamlit as st
import pandas as pd
import gspread
from google.auth.credentials import Credentials
import re


def _extract_sheet_id(url: str) -> str:
    """URL에서 스프레드시트 ID 추출"""
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url)
    if match:
        return match.group(1)
    raise ValueError(f"유효하지 않은 Google Sheets URL: {url}")


def _get_client(creds: Credentials) -> gspread.Client:
    return gspread.Client(auth=creds)


@st.cache_data(ttl=30, show_spinner=False)
def read_sheet(_creds, sheet_url: str, worksheet_name: str) -> pd.DataFrame | None:
    """시트 데이터를 DataFrame으로 반환 (30초 캐시)"""
    try:
        gc = _get_client(_creds)
        sheet_id = _extract_sheet_id(sheet_url)
        spreadsheet = gc.open_by_key(sheet_id)
        worksheet = spreadsheet.worksheet(worksheet_name)
        data = worksheet.get_all_records()
        if data:
            return pd.DataFrame(data)
        # 데이터 행이 없으면 헤더 행이라도 있으면 컬럼 구조 유지
        all_values = worksheet.get_all_values()
        if all_values and all_values[0] and any(v != "" for v in all_values[0]):
            return pd.DataFrame([], columns=all_values[0])
        return pd.DataFrame(data)
    except gspread.exceptions.SpreadsheetNotFound:
        st.error("스프레드시트를 찾을 수 없습니다. URL 또는 접근 권한을 확인해주세요.")
        return None
    except gspread.exceptions.WorksheetNotFound:
        st.error(f"워크시트 '{worksheet_name}'를 찾을 수 없습니다.")
        return None
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return None
    except Exception as e:
        st.error(f"오류: {type(e).__name__}: {e}")
        return None


def write_sheet(creds: Credentials, sheet_url: str, worksheet_name: str, row: int, col: int, value: str) -> bool:
    """특정 셀에 값 쓰기"""
    try:
        gc = _get_client(creds)
        sheet_id = _extract_sheet_id(sheet_url)
        worksheet = gc.open_by_key(sheet_id).worksheet(worksheet_name)
        worksheet.update_cell(row, col, value)
        return True
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return False
    except Exception as e:
        st.error(f"쓰기 오류: {type(e).__name__}: {e}")
        return False


def append_row(creds: Credentials, sheet_url: str, worksheet_name: str, values: list) -> bool:
    """시트 마지막에 새 행 추가"""
    try:
        gc = _get_client(creds)
        sheet_id = _extract_sheet_id(sheet_url)
        worksheet = gc.open_by_key(sheet_id).worksheet(worksheet_name)
        worksheet.append_row(values, value_input_option="USER_ENTERED")
        return True
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return False
    except Exception as e:
        st.error(f"행 추가 오류: {type(e).__name__}: {e}")
        return False


def delete_row(creds: Credentials, sheet_url: str, worksheet_name: str, row: int) -> bool:
    """시트에서 특정 행 삭제 (row는 1부터 시작)"""
    try:
        gc = _get_client(creds)
        sheet_id = _extract_sheet_id(sheet_url)
        worksheet = gc.open_by_key(sheet_id).worksheet(worksheet_name)
        worksheet.delete_rows(row)
        return True
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return False
    except Exception as e:
        st.error(f"삭제 오류: {type(e).__name__}: {e}")
        return False


def create_worksheet(creds: Credentials, sheet_url: str, title: str, rows: int = 100, cols: int = 26, headers: list[str] | None = None) -> bool:
    """새 워크시트 생성, 선택적으로 헤더 행도 추가"""
    try:
        gc = _get_client(creds)
        sheet_id = _extract_sheet_id(sheet_url)
        spreadsheet = gc.open_by_key(sheet_id)
        sheet = spreadsheet.add_worksheet(title=title, rows=rows, cols=cols)
        if headers:
            sheet.update(values=[headers], range_name="A1:B1")
        return True
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return False
    except Exception as e:
        st.error(f"시트 생성 오류: {type(e).__name__}: {e}")
        return False


def get_sheet_list(creds: Credentials, sheet_url: str) -> list[str]:
    """스프레드시트의 모든 시트 이름 목록 반환"""
    try:
        gc = _get_client(creds)
        sheet_id = _extract_sheet_id(sheet_url)
        spreadsheet = gc.open_by_key(sheet_id)
        return [ws.title for ws in spreadsheet.worksheets()]
    except gspread.exceptions.APIError as e:
        st.error(f"API 오류 ({e.response.status_code}): {e.response.json().get('error', {}).get('message', e)}")
        return []
    except Exception as e:
        st.error(f"시트 목록 오류: {type(e).__name__}: {e}")
        return []
