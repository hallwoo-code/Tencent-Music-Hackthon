from __future__ import annotations

import base64
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).parent
COMPONENTS = ROOT / "components"
DATA = ROOT / "data"
ASSETS = ROOT / "assets"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path) -> object:
    return json.loads(read_text(path))


def data_uri(path: Path, mime: str) -> str:
    if not path.exists():
        return ""
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def build_component_html() -> str:
    html = read_text(COMPONENTS / "player.html")
    css = read_text(COMPONENTS / "styles.css")
    js = read_text(COMPONENTS / "player.js")
    payload = {
        "lyrics": read_json(DATA / "lyrics.json"),
        "interactionPoints": read_json(DATA / "interaction_points.json"),
        "comments": read_json(DATA / "comments.json"),
        "scores": read_json(DATA / "resonance_scores.json"),
        "defaultLrc": read_text(ASSETS / "lyrics" / "demo_track.lrc"),
        "defaultAudio": data_uri(ASSETS / "audio" / "demo_track.mp3", "audio/mpeg"),
        "defaultPoster": data_uri(ASSETS / "images" / "poster.svg", "image/svg+xml"),
    }
    return (
        html.replace("__STYLE__", f"<style>{css}</style>")
        .replace("__DATA__", f"<script>window.RESONANCE_DATA = {json.dumps(payload, ensure_ascii=False)};</script>")
        .replace("__SCRIPT__", f"<script>{js}</script>")
    )


def main() -> None:
    st.set_page_config(
        page_title="AI 音浪共振器 Demo",
        page_icon="🎵",
        layout="wide",
        initial_sidebar_state="collapsed",
    )

    st.markdown(
        """
        <style>
          .block-container { padding: 0; max-width: 100%; }
          header, footer { display: none !important; }
          iframe { display: block; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    components.html(build_component_html(), height=980, scrolling=True)


if __name__ == "__main__":
    main()
