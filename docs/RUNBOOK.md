# Runbook

## Local Run

```bash
pip install -r requirements.txt
streamlit run app.py
```

## Preflight Checks

```bash
python -m py_compile app.py
node --check components/player.js
python -m json.tool data/lyrics.json
python -m json.tool data/interaction_points.json
python -m json.tool data/comments.json
python -m json.tool data/resonance_scores.json
```

## Streamlit Cloud

1. Push this folder to GitHub.
2. Create a new Streamlit app from the repository.
3. Set main file path to `app.py`.
4. Deploy.

## Common Issues

- If the audio does not play, click the play button after the page loads. Browsers block autoplay.
- If the page feels heavy, turn off `动效`.
- If interaction sound is distracting, turn off `音效`.
- If Streamlit shows a missing file error, check that `assets/`, `components/`, and `data/` are committed.
- If the default audio cannot be used publicly, replace `assets/audio/demo_track.mp3` with an authorized MP3 using the same file name.
