import base64
import json

import streamlit as st
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_credentials() -> Credentials | None:
    try:
        encoded = st.secrets["gcp"]["sa_b64"].replace("\n", "").replace(" ", "")
        raw = base64.b64decode(encoded).decode("utf-8")
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        st.error("secrets.toml에 [gcp] sa_b64 키가 없습니다.")
        return None
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None


def logout():
    pass
