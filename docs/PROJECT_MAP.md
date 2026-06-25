# Project Map

## Runtime Entry

- `app.py`: Streamlit app entry. It reads component HTML, CSS, JS, JSON data, and local assets, then injects them into `streamlit.components.v1.html`.
- `requirements.txt`: Python dependency list for local and Streamlit Cloud deployment.

## Frontend Component

- `components/player.html`: DOM structure for the immersive player, settlement overlay, and lyric resonance field.
- `components/styles.css`: Visual system, responsive layout, lyric templates, particle layers, settlement, and field styling.
- `components/player.js`: Playback control, lyric sync, AI point prompts, canvas effects, result animation, comment wave, and charging logic.

## Data

- `data/lyrics.json`: Timestamped demo lyrics and lyric motion templates.
- `data/interaction_points.json`: Simulated AI interaction points using the requested schema.
- `data/comments.json`: Highlighted lyric cloud, comments, heat, and charge counts.
- `data/resonance_scores.json`: Final settlement scores.

## Assets

- `assets/audio/demo_track.mp3`: Default demo audio copied into the project. Replace before public release if needed.
- `assets/images/cover.svg`: Generated cover image.
- `assets/images/poster.svg`: Generated poster background for the immersive stage.
- `assets/sounds/README.md`: Notes for optional sound asset replacement.

## Legacy Output

- `outputs/ai-sonic-resonance-prototype/`: Earlier static prototype kept for continuity. The deployable Streamlit version now lives at the project root.
