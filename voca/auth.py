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
    # 1. Streamlit Cloud: p1~p40 base64 chunk 방식
    try:
        b64 = "".join(st.secrets[f"p{i}"] for i in range(1, KEY_COUNT + 1))
        raw = base64.b64decode(b64).decode("utf-8")
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        pass
    except Exception as e:
        st.error(f"인증 오류: {e}")
        return None

    # 2. 로컬 개발: [gcp] 섹션의 service_account_json
    try:
        raw = st.secrets["gcp"]["service_account_json"]
        info = json.loads(raw)
        return Credentials.from_service_account_info(info, scopes=SCOPES)
    except KeyError:
        pass
    except Exception:
        pass  # PEM 오류 등 → 환경변수 방식으로 fallback

    # 3. 로컬 개발: GOOGLE_APPLICATION_CREDENTIALS 환경변수
    import os
    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if path:
        try:
            return Credentials.from_service_account_file(path, scopes=SCOPES)
        except Exception as e:
            st.error(f"인증 오류: {e}")
            return None

    st.error("secrets에 p1~p40 또는 [gcp] 키가 없고, GOOGLE_APPLICATION_CREDENTIALS도 설정되지 않았습니다.")
    return None


def logout():
    pass
