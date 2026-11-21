# Kulfi reference study (App Store listing + kulfi.club)

Notes from studying the real app before rebuilding ours. Sources: the App Store listing for
*Kulfi: Games for Couples* (id 6740579527, seller WooshAuto Internet Pvt Ltd) and kulfi.club.
No Kulfi art, names, mascots or copy were reused — the list below is analysis, not assets.

## Product facts

- **Two phones, one game, at once.** Games run across both devices; some split the controls
  between partners so it is one machine with two halves (co-op), some are turn-based, some are
  race/score.
- **Pairing is an invite code**, and the games stay locked until a partner joins — "no singles".
- **Built to sit inside a call**: you keep the video/audio call up and play through it.
- **Meta layer called Roadtrip**: miles accumulate as you play, your car moves across a map,
  cities unlock, clues hint at the next stop; other couples are on the same road.
- **20+ games, weekly additions**, coins/gems, a streak flame.
- Tone of copy: Hinglish banter, "one more game", teasing, not romantic-sappy.

## Game list (kulfi.club)

Daily: daily question, chess, draw-and-guess, one-line puzzle, hangman, jigsaw, ludo,
moodoku (6×6 sudoku), cow puzzle, swimmer maze, spot the difference, this-or-that,
word path, wordle-style.
Competitive: connect four, yeet the spider, basketball rhythm tap, snatch the fries,
syllable word typing, aloo shot-aim, swing/aim timing.
Co-op: pirate boat (split controls, both must tap in sync), DDAJ maze (tilt both phones),
Aloo & Pyaaz hot-floor jumps.
Conversation: never have I ever, who's more likely, pillow-talk prompts, this-or-that,
daily question.

## Visual language (from the 6 screenshots)

- **Stage**: near-black navy with a red/magenta glow from the top; vignette; stars/sparkles.
- **Headline type**: very heavy rounded sans, white, with one or two words in coral
  (`#FF8A8A`-ish); handwritten doodles around it (dashed arrow, flower, sparkles).
- **Game tiles are physical cards**: cream thick border, glossy gradient art inside,
  hand-drawn illustration of the game, and the game name in a chunky cream, dark-outlined
  display face at the bottom. Cards are tilted in 2.5D with soft shadows — "cards on a table".
- **In-game chrome**: `LEAVE` pill in red at top-left, audio/video toggles beside it,
  a gem/coin score chip (`00864`) with an XP bar and a timer (`12ms`), the partner's video in
  a rounded PiP at top-right, a mascot face-off bubble between the two players, and a coin
  badge bottom-left.
- **Bottom nav**: floating dark pill with home, chat (unread badge), profile.
- **Feel**: dark arcade cabinet + glossy toy cards, not pastel illustration.

## What we adopted in Jodi (and what we did not)

Adopted: dark plum stage with coral glow, coral-on-white headline with an emphasised word,
cards with cream title badges and a corner tag, face-off HUD with two score pills and a
`CHHODO` pill, floating bottom nav (Home / Kitaab / Notes / Tum), darker 3D scenes with
vignette.

Not adopted: their artwork, mascots, game names and copy (copyright), and their fake-3D
marketing tiles — ours are rendered from code so they stay crisp and asset-free.

## Gaps worth closing next

- Co-op games where both phones hold half the control (Pirate Escape style) — we have none.
- A meta-progress layer (their Roadtrip). Ours is Hamari Kitaab + streak; a shared "map"
  would be the equivalent.
- Real illustrated cover art per game instead of emoji art blocks.
