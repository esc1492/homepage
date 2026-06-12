import base64
import hashlib
import json
import os
from datetime import datetime

import streamlit as st
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_client_config():
    """secrets.toml에서 OAuth 설정 읽기"""
    return {
        "web": {
            "client_id": st.secrets["google_oauth"]["client_id"],
            "client_secret": st.secrets["google_oauth"]["client_secret"],
            "redirect_uris": ["http://localhost:8501"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def _generate_pkce_pair():
    """code_verifier / code_challenge 쌍 생성"""
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode()
    code_challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    return code_verifier, code_challenge


def get_credentials():
    """세션에서 자격증명 반환, 없으면 OAuth 흐름 시작"""

    # 1. 세션에 이미 저장된 토큰이 있으면 사용
    if "google_token" in st.session_state:
        token_data = st.session_state["google_token"]

        # expiry 복원
        expiry = None
        if token_data.get("expiry"):
            try:
                expiry = datetime.fromisoformat(token_data["expiry"])
            except Exception:
                pass

        creds = Credentials(
            token=token_data["token"],
            refresh_token=token_data["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=st.secrets["google_oauth"]["client_id"],
            client_secret=st.secrets["google_oauth"]["client_secret"],
            scopes=SCOPES,
            expiry=expiry,
        )
        # expiry 없거나 만료된 경우 항상 갱신
        if not creds.token or creds.expired:
            creds.refresh(Request())
            _save_token(creds)
        return creds

    # 2. OAuth 콜백 코드가 URL에 있으면 토큰 교환
    query_params = st.query_params
    if "code" in query_params:
        # state 파라미터에서 code_verifier 복원
        raw_state = query_params.get("state", "")
        try:
            padding = "=" * (-len(raw_state) % 4)
            state_data = json.loads(base64.urlsafe_b64decode(raw_state + padding))
            code_verifier = state_data["cv"]
        except Exception:
            st.error("인증 상태가 손상되었습니다. 다시 로그인해주세요.")
            st.query_params.clear()
            st.stop()

        flow = Flow.from_client_config(
            get_client_config(),
            scopes=SCOPES,
            redirect_uri="http://localhost:8501",
        )
        flow.fetch_token(code=query_params["code"], code_verifier=code_verifier)
        creds = flow.credentials
        _save_token(creds)
        st.query_params.clear()
        st.rerun()

    # 3. PKCE 쌍 생성 후 로그인 버튼 표시
    code_verifier, code_challenge = _generate_pkce_pair()

    state_payload = base64.urlsafe_b64encode(
        json.dumps({"cv": code_verifier}).encode()
    ).rstrip(b"=").decode()

    flow = Flow.from_client_config(
        get_client_config(),
        scopes=SCOPES,
        redirect_uri="http://localhost:8501",
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state_payload,
        code_challenge=code_challenge,
        code_challenge_method="S256",
    )

    st.link_button("🔑 Google 계정으로 로그인", auth_url, use_container_width=True)
    return None


def _save_token(creds: Credentials):
    st.session_state["google_token"] = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "expiry": creds.expiry.isoformat() if creds.expiry else None,
    }


def logout():
    st.session_state.pop("google_token", None)
