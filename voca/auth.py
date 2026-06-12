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
    except KeyError:
        st.error("secrets.toml에 [gcp_service_account] 섹션이 없습니다.")
        return None
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None


def logout():
    pass
