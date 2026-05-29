import streamlit as st
from anthropic import Anthropic
import os

st.set_page_config(
    page_title="미키 챗봇",
    page_icon="🐭",
    layout="centered",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
.user-avatar { background: #e8e7e2; border-radius: 50%; }
.stChatMessage { background: transparent !important; }
.stChatInput { border: 1px solid #cdcdc9 !important; border-radius: 4px !important; }
.stChatInput:focus { border-color: #262510 !important; }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown(
    "<div style='text-align:center;padding:1rem 0 0.5rem'><h1 style='font-size:24px;font-weight:500'>🐭 미키 챗봇</h1>"
    "<p style='color:#7a7974;font-size:13px;margin-top:4px'>AI 비서 미키야! 🎉</p></div>",
    unsafe_allow_html=True,
)

MAX_HISTORY = 20

api_key = os.environ.get("ANTHROPIC_API_KEY")
base_url = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

if not api_key:
    st.error("ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.")
    st.stop()

client = Anthropic(api_key=api_key, base_url=base_url)

WEB_TOOL = {"type": "web_search_20250305", "name": "web_search"}

SYSTEM_PROMPT = (
    "너는 '미키'야. 사용자의 개인 시작 페이지의 챗봇 도우미야. "
    "항상 한국어로 친절하고 간결하게 답변해. "
    "사용자가 시작 페이지 기능에 대해 물어보면 날씨, 주식, 할 일 목록 등의 기능을 안내해 줘. "
    "실시간 정보(날씨, 뉴스, 검색 등)가 필요하면 web_search 도구를 사용해."
)

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "안녕! 나는 미키야! 😊\n\n무엇을 도와줄까?"}
    ]

for msg in st.session_state.messages:
    avatar = "🐭" if msg["role"] == "assistant" else "🧑"
    with st.chat_message(msg["role"], avatar=avatar):
        st.write(msg["content"])

if prompt := st.chat_input("메시지를 입력하세요..."):
    st.chat_message("user", avatar="🧑").write(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    history = st.session_state.messages[-MAX_HISTORY:]
    msgs = [{"role": m["role"], "content": m["content"]} for m in history]

    with st.chat_message("assistant", avatar="🐭"):
        def generate():
            stream = client.messages.create(
                model=model,
                system=SYSTEM_PROMPT,
                messages=msgs,
                max_tokens=4096,
                stream=True,
                tools=[WEB_TOOL],
            )
            for event in stream:
                if hasattr(event, 'delta') and hasattr(event.delta, 'text'):
                    yield event.delta.text
        full = st.write_stream(generate())

    st.session_state.messages.append({"role": "assistant", "content": full})
