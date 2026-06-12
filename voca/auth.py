import json
import traceback

import streamlit as st
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_credentials() -> Credentials | None:
    try:
        raw = st.secrets["gcp"]["service_account_json"]
    except KeyError:
        st.error("secrets.toml에 [gcp] service_account_json이 없습니다.")
        return None

    try:
        info = json.loads(raw)
    except json.JSONDecodeError as e:
        st.error(f"service_account_json JSON 파싱 오류: {e}")
        return None

    try:
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except Exception as e:
        st.error(f"서비스 계정 인증 실패: {e}")
        st.code(traceback.format_exc(), line_limit=10)
        return None


def logout():
    pass
