#!/usr/bin/env python3
"""
Hotel Queen's Inn promo video (9:16, 1080x1920) in English and/or Tamil.

The voiceover is made with Google's Gemini text-to-speech (the same voices as Google AI Studio).
Your API key is read from the GEMINI_API_KEY environment variable and is never written to disk or printed.

    python make_promo.py                      # asks for language and voice
    python make_promo.py --lang ta --voice Kore
    python make_promo.py --lang both --voice Sulafat
    python make_promo.py --sample --lang en   # short samples of the female voices, to listen and choose
    python make_promo.py --dry-run --lang en  # no voice, no key: builds a silent video to check the pictures

Needs: Python 3.9+, ffmpeg and ffprobe on PATH, and Microsoft Edge or Google Chrome (to draw the captions, which makes
Tamil letters join correctly). No extra Python packages.
"""
import argparse, base64, hashlib, json, os, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.request, wave
from html import escape
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = HERE.parent.parent / "deploy" / "seed" / "media"
OUT = HERE / "out"
CACHE = HERE / ".cache"
API = "https://generativelanguage.googleapis.com/v1beta"
W, H, FPS = 1080, 1920, 30

# Female voices of Gemini text-to-speech, with Google's own one-word description.
FEMALE_VOICES = [
    ("Sulafat", "Warm"), ("Kore", "Firm"), ("Zephyr", "Bright"), ("Leda", "Youthful"), ("Aoede", "Breezy"),
    ("Callirrhoe", "Easy-going"), ("Despina", "Smooth"), ("Erinome", "Clear"), ("Achernar", "Soft"),
    ("Vindemiatrix", "Gentle"), ("Laomedeia", "Upbeat"), ("Autonoe", "Bright"), ("Gacrux", "Mature"), ("Pulcherrima", "Forward"),
]
LANGS = {"en": "English", "ta": "Tamil (தமிழ்)"}
STYLE = {"en": "Say warmly, calmly and clearly, like a hotel promo voiceover",
         "ta": "Say in Tamil, warmly, calmly and clearly, like a hotel promo voiceover"}


for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8")   # Tamil letters in menus and messages on a Windows console
    except Exception: pass


def die(msg):
    print("\n" + msg, file=sys.stderr)
    sys.exit(1)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        die(f"Command failed: {' '.join(map(str, cmd[:3]))} ...\n{r.stderr[-1500:]}")
    return r.stdout


# ---------------------------------------------------------------- Gemini text-to-speech
def api(method, path, key, body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"x-goog-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def pick_model(key, forced):
    if forced:
        return forced
    try:
        models = api("GET", "/models?pageSize=200", key).get("models", [])
    except urllib.error.HTTPError as e:
        die(f"Google rejected the key or the request ({e.code}). Check GEMINI_API_KEY and that the Gemini API is enabled for it.")
    names = [m["name"].split("/")[-1] for m in models
             if "tts" in m["name"] and "generateContent" in m.get("supportedGenerationMethods", [])]
    if not names:
        die("No text-to-speech model is available for this key. Use --model with a model name from AI Studio.")
    names.sort(key=lambda n: (("flash" not in n), ("preview" in n), n))   # prefer flash, prefer released over preview
    return names[0]


def synth(key, model, voice, text, lang, retries=6):
    """Returns 24 kHz mono 16-bit PCM bytes."""
    body = {"contents": [{"parts": [{"text": f"{STYLE[lang]}: {text}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    for attempt in range(retries):
        try:
            res = api("POST", f"/models/{model}:generateContent", key, body)
            part = res["candidates"][0]["content"]["parts"][0]["inlineData"]
            return base64.b64decode(part["data"])
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < retries - 1:
                wait = 12 * (attempt + 1)
                print(f"   (Google asked us to slow down; waiting {wait}s)")
                time.sleep(wait)
                continue
            detail = e.read().decode("utf-8", "ignore")[:300]
            die(f"Voice generation failed ({e.code}): {detail}")
        except (KeyError, IndexError):
            if attempt < retries - 1:
                time.sleep(3)
                continue
            die("Google returned no audio for this line. Try again, or pick another voice.")


def save_wav(path, pcm):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)


def voice_for(scene_text, lang, voice, model, key, dry):
    CACHE.mkdir(exist_ok=True)
    tag = hashlib.sha1(f"{model}|{voice}|{lang}|{scene_text}".encode()).hexdigest()[:12]
    p = CACHE / f"{lang}-{voice}-{tag}.wav"
    if dry:                                  # silent stand-in, about as long as the speech would be
        secs = max(2.0, len(scene_text) / (13.0 if lang == "en" else 11.0))
        save_wav(p := CACHE / f"dry-{lang}-{tag}.wav", b"\x00\x00" * int(24000 * secs))
        return p
    if not p.exists():
        save_wav(p, synth(key, model, voice, scene_text, lang))
    return p


def wav_seconds(p):
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


# ---------------------------------------------------------------- captions (drawn by the browser so Tamil joins correctly)
def find_browser():
    for c in [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]:
        if os.path.exists(c):
            return c
    return shutil.which("msedge") or shutil.which("chrome") or shutil.which("chromium")


# Words that must stay on one line, whatever the caption width (the hotel's name in English and Tamil).
KEEP_TOGETHER = ["Queen's Inn", "குயின்ஸ் இன்", "KVR Mahal", "கே.வி.ஆர் மஹால்"]


def keep_together(text):
    out = escape(text)
    for phrase in KEEP_TOGETHER:
        e = escape(phrase)
        out = out.replace(e, f'<span style="white-space:nowrap">{e}</span>')
    return out


def caption_png(browser, title, sub, dest, tmp):
    html = f"""<!doctype html><meta charset=utf-8><style>
      html,body{{margin:0;background:transparent}}
      .b{{width:{W}px;height:460px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:0 70px 20px;box-sizing:border-box;text-align:center;
          background:linear-gradient(to top,rgba(10,16,28,.82),rgba(10,16,28,.55) 60%,rgba(10,16,28,0));
          font-family:'Nirmala UI','Segoe UI','Noto Sans Tamil','Noto Sans',sans-serif;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.6)}}
      h1{{margin:0;font-size:76px;line-height:1.2;font-weight:700}}
      p{{margin:14px 0 0;font-size:42px;line-height:1.3;color:#f1d58a;font-weight:600}}
    </style><div class=b><h1>{keep_together(title)}</h1>{f'<p>{keep_together(sub)}</p>' if sub else ''}</div>"""
    f = Path(tmp) / (dest.stem + ".html")
    f.write_text(html, encoding="utf-8")
    dest = Path(dest).resolve()
    # A private profile folder makes this a separate browser, so it works even while Edge or Chrome is open.
    run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
         f"--user-data-dir={Path(tmp) / 'profile'}", "--no-first-run", f"--window-size={W},460", f"--screenshot={dest}", f.as_uri()], timeout=90)
    if not dest.exists():
        die("The browser did not draw the captions. Close all Edge/Chrome windows and try again.")


# ---------------------------------------------------------------- pictures
def probe(p):
    o = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(p)]).strip().split(",")
    return int(o[0]), int(o[1])


def image_clip(img, secs, idx, dest, with_caption=None, logo=None):
    """A slow pan across the photo, cropped to 9:16; optional caption and logo laid over it."""
    iw, ih = probe(img)
    d = f"{secs:.3f}"
    prog = "t" if idx % 2 == 0 else f"({d}-t)"      # alternate the pan direction from photo to photo
    if iw / ih >= W / H:                         # landscape: fit the height, pan sideways
        vf = f"scale=-2:{H},crop={W}:{H}:x='(iw-{W})*{prog}/{d}':y=0"
    else:                                        # portrait: fit the width, pan up and down
        vf = f"scale={W}:-2,crop={W}:{H}:x=0:y='(ih-{H})*{prog}/{d}'"
    inputs = ["-loop", "1", "-framerate", str(FPS), "-t", f"{secs:.3f}", "-i", str(img)]
    chain = f"[0:v]{vf},setsar=1,format=yuv420p[v0]"
    last = "v0"
    n = 1
    if logo:
        inputs += ["-i", str(logo)]
        chain += f";[{n}:v]scale=760:-2[lg];[{last}]drawbox=0:0:{W}:{H}:color=black@0.45:t=fill[dk];[dk][lg]overlay=(W-w)/2:520[v{n}]"
        last = f"v{n}"; n += 1
    if with_caption:
        inputs += ["-loop", "1", "-framerate", str(FPS), "-t", f"{secs:.3f}", "-i", str(with_caption)]
        chain += f";[{last}][{n}:v]overlay=0:1230:format=auto[v{n}]"
        last = f"v{n}"
    chain += f";[{last}]fade=t=in:st=0:d=0.25,fade=t=out:st={max(0, secs - 0.25):.3f}:d=0.25,format=yuv420p[out]"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", chain, "-map", "[out]",
         "-r", str(FPS), "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", str(dest)])


# ---------------------------------------------------------------- build
def build(lang, voice, model, key, dry, music, scenes):
    OUT.mkdir(exist_ok=True)
    browser = find_browser()
    if not browser:
        die("Microsoft Edge or Google Chrome is needed to draw the captions, and neither was found.")
    label = "silent" if dry else voice
    final = OUT / f"queens-inn-promo-{lang}-{label}.mp4"
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        parts = []
        for i, sc in enumerate(scenes, 1):
            t = sc[lang]
            print(f"[{i}/{len(scenes)}] {t['title']}")
            wav = voice_for(t["say"], lang, voice, model, key, dry)
            dur = wav_seconds(wav) + (1.1 if sc.get("end") else 0.5)      # a breath after each line, a longer hold on the end card
            cap = td / f"cap{i}.png"
            caption_png(browser, t["title"], t["sub"], cap, td)
            imgs = [MEDIA / n for n in sc["images"]]
            for p in imgs:
                if not p.exists():
                    die(f"Photo not found: {p}")
            each = dur / len(imgs)
            clips = []
            for j, img in enumerate(imgs):
                c = td / f"s{i}_{j}.mp4"
                image_clip(img, each, i + j, c, with_caption=cap,
                           logo=(MEDIA / sc["logo"]) if sc.get("logo") else None)
                clips.append(c)
            lst = td / f"l{i}.txt"
            lst.write_text("".join(f"file '{c.as_posix()}'\n" for c in clips))
            scene = td / f"scene{i}.mp4"
            vid = td / f"v{i}.mp4"
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(vid)])
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(vid), "-i", str(wav),
                 "-af", f"aresample=48000,apad", "-t", f"{dur:.3f}", "-map", "0:v", "-map", "1:a",
                 "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", str(scene)])
            parts.append(scene)
        lst = td / "all.txt"
        lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts))
        joined = td / "joined.mp4"
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
             "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
             "-movflags", "+faststart", str(joined)])
        if music:
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(joined), "-stream_loop", "-1", "-i", str(music),
                 "-filter_complex", "[1:a]volume=0.10[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]",
                 "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(final)])
        else:
            shutil.copy(joined, final)
    secs = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(final)]).strip())
    print(f"\nDone: {final}  ({secs:.0f} seconds, {final.stat().st_size / 1e6:.1f} MB)")


# ---------------------------------------------------------------- samples and menus
def choose(title, options, default=1):
    print(f"\n{title}")
    for i, o in enumerate(options, 1):
        print(f"  {i}) {o}")
    while True:
        a = input(f"Choose 1-{len(options)} [{default}]: ").strip() or str(default)
        if a.isdigit() and 1 <= int(a) <= len(options):
            return int(a) - 1


def pick_voice(lang):
    opts = [f"{n} ({d})" for n, d in FEMALE_VOICES]
    print(f"\nFemale voices for {LANGS[lang]}. Tip: run with --sample first to hear them.")
    return FEMALE_VOICES[choose(f"Voice for {LANGS[lang]}", opts, 1 if lang == "en" else 2)][0]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=["en", "ta", "both"])
    ap.add_argument("--voice", help="Gemini voice name, e.g. Sulafat or Kore (female voices listed in the menu)")
    ap.add_argument("--model", help="text-to-speech model name; found automatically if left out")
    ap.add_argument("--music", help="optional background music file (mp3/wav), mixed in quietly")
    ap.add_argument("--sample", action="store_true", help="make short samples of the female voices instead of the video")
    ap.add_argument("--dry-run", action="store_true", help="no voice and no key: builds a silent video to check the pictures")
    a = ap.parse_args()

    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        die("ffmpeg and ffprobe must be installed and on PATH.")
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key and not a.dry_run:
        die("Set your Google AI Studio key first (type it in your own terminal, not in a chat):\n"
            "  PowerShell:  $env:GEMINI_API_KEY = 'your-key'\n  then run this script again.")

    langs = [a.lang] if a.lang in ("en", "ta") else ["en", "ta"] if a.lang == "both" else None
    if langs is None:
        langs = [["en"], ["ta"], ["en", "ta"]][choose("Language", ["English", "Tamil (தமிழ்)", "Both"], 1)]
    model = None if a.dry_run else pick_model(key, a.model)
    if model:
        print(f"Using voice model: {model}")

    if a.sample:
        OUT.mkdir(exist_ok=True)
        sd = OUT / "samples"; sd.mkdir(exist_ok=True)
        line = {"en": "Welcome to Hotel Queen's Inn, Velankanni. Three gated acres of garden, ten minutes from the Basilica.",
                "ta": "ஹோட்டல் குயின்ஸ் இன் வேளாங்கண்ணிக்கு வரவேற்கிறோம். பேராலயத்திலிருந்து பத்து நிமிடங்களில், மூன்று ஏக்கர் தோட்டம்."}
        for lang in langs:
            for name, desc in FEMALE_VOICES[:6]:
                print(f"sample {lang} {name} ({desc})")
                save_wav(sd / f"{lang}-{name}.wav", synth(key, model, name, line[lang], lang))
        print(f"\nListen to the files in {sd}, then run again with --voice NAME")
        return

    scenes = json.loads((HERE / "scenes.json").read_text(encoding="utf-8"))["scenes"]
    for lang in langs:
        voice = a.voice or ("-" if a.dry_run else pick_voice(lang))
        if voice != "-" and voice not in [n for n, _ in FEMALE_VOICES]:
            print(f"Note: {voice} is not in the female list; using it anyway.")
        print(f"\n=== {LANGS[lang]} · voice {voice} ===")
        build(lang, voice, model, key, a.dry_run, a.music, scenes)


if __name__ == "__main__":
    main()
