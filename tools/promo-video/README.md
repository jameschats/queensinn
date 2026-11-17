# Queen's Inn promo video (9:16, English and Tamil)

Makes a 1080x1920 video from the site's own photos, with on-screen captions and a female voiceover from Google's Gemini
text-to-speech (the voices in Google AI Studio). The words are in `scenes.json`; edit them, then run again.

## One-time
1. Get a free key at https://aistudio.google.com/apikey.
2. Open `tools\promo-video\.env` (created empty, and ignored by git) and paste the key after `GEMINI_API_KEY=` with no quotes. Save it.
   Never paste the key into a chat or into any file that is committed.
3. Needs Python 3, ffmpeg (already installed on this PC) and Microsoft Edge or Google Chrome.

## Run
```powershell
cd "D:\Clients\Queensinn\2026 website revamp\queensinn\tools\promo-video"
python make_promo.py            # menus: language (English / Tamil / Both), then a female voice
```

Skip the menus: `python make_promo.py --lang ta --voice Kore`  or  `--lang both --voice Sulafat`.

**Hear the voices first:** `python make_promo.py --sample --lang ta` writes short samples of six female voices to `out\samples\`.

Female voices: Sulafat (warm), Kore (firm), Zephyr (bright), Leda (youthful), Aoede (breezy), Callirrhoe (easy-going), Despina (smooth),
Erinome (clear), Achernar (soft), Vindemiatrix (gentle), Laomedeia (upbeat), Autonoe (bright), Gacrux (mature), Pulcherrima (forward).

Videos land in `out\` as `queens-inn-promo-en-<voice>.mp4` and `queens-inn-promo-ta-<voice>.mp4`.
Voice lines are cached in `.cache\`, so re-running after a picture or caption change costs no extra voice calls.

## Options
- `--music song.mp3` mixes in background music very quietly (use music you have the right to use).
- `--dry-run` builds a silent video without a key, only to check the pictures.
- `--model NAME` if you want a specific text-to-speech model; otherwise the script finds one your key can use.

## Before posting
- Listen to the Tamil voice all the way through, with someone who speaks Tamil well. Machine voices can mispronounce words;
  if one is off, respell it in `say` in `scenes.json` (the `title` shown on screen is separate).
- The rate "from Rs 3,500 + GST" and the Q multi-cuisine restaurant name come from the website; delete the price sentence
  in `scenes.json` if the hotel prefers not to quote a rate.
- Photos are the site's own. Room photos are matched to rooms by eye, so check each room shot against the room named.
