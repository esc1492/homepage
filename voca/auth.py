import json
import os

import streamlit as st
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_credentials() -> Credentials | None:
    try:
        raw = st.secrets["sa"]
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        st.error("secrets에 sa 키가 없습니다.")
        return None
    except json.JSONDecodeError as e:
        st.error(f"JSON 파싱 오류: {e}")
        return None
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None


def logout():
    pass
