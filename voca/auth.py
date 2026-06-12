import streamlit as st
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_credentials() -> Credentials | None:
    try:
        return Credentials.from_service_account_info(
            st.secrets["gcp_service_account"], scopes=SCOPES
        )
    except Exception:
        st.error("서비스 계정 인증 정보가 올바르지 않습니다.")
        return None


def logout():
    pass
