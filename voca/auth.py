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
        # Streamlit Cloud: p1~p40 base64 chunk 방식
        b64 = "".join(st.secrets[f"p{i}"] for i in range(1, KEY_COUNT + 1))
        raw = base64.b64decode(b64).decode("utf-8")
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        pass  # Cloud 방식 실패 → 로컬 방식 시도
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None

    try:
        # 로컬 개발: [gcp] 섹션의 service_account_json
        raw = st.secrets["gcp"]["service_account_json"]
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        st.error("secrets에 p1~p40 또는 [gcp] 키가 없습니다.")
        return None
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None


def logout():
    pass
