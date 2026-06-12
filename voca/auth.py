import base64
import json

import streamlit as st
from google.oauth2.service_account import Credentials

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

KEY_COUNT = 40


def get_credentials() -> Credentials | None:
    try:
        b64 = "".join(st.secrets[f"p{i}"] for i in range(1, KEY_COUNT + 1))
        raw = base64.b64decode(b64).decode("utf-8")
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        st.error("secrets에 p1~p40 키가 없습니다.")
        return None
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None


def logout():
    pass
