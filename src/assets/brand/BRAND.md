# NEURO — Brand Guide

> **Your voice. Smart risk. Real yield.**
> Voice-first AI wealth OS on Solana.

NEURO is a calm, superhuman financial intelligence you *speak* to. The brand has
to feel premium, precise and a little uncanny — the confidence of a private bank
crossed with the responsiveness of a voice you trust. Never hype, never noisy.

---

## 1. The idea behind the mark

The mark is a **voice waveform that is also a rising wealth curve** — five rounded
bars, jagged like speech but trending upward like a portfolio. It sits inside a
faint **orbit ring** (the "OS" / cross-chain layer) with two orbiting **synapse
nodes**: cyan for *signal*, violet for *intelligence*.

One symbol, three truths: **voice · growth · neural**. That double-read is the
single thing NEURO should be remembered by — protect it. Don't add a brain
icon, a coin, or a soundbars cliché on top of it.

| Asset | File | Use |
|---|---|---|
| Primary mark | [`neuro-mark.svg`](neuro-mark.svg) | App, avatar, loading states |
| Horizontal lockup (dark) | [`neuro-logo.svg`](neuro-logo.svg) | Headers, docs, README on dark |
| Horizontal lockup (light) | [`neuro-logo-light.svg`](neuro-logo-light.svg) | Slides / print on light |
| App icon / favicon | [`neuro-favicon.svg`](neuro-favicon.svg) | Browser tab, PWA, dApp store |
| Social / OG banner | [`neuro-banner.svg`](neuro-banner.svg) | OG image, hackathon card |

PNG renders sit next to each SVG. Files prefixed `_preview-` are background
mock-ups, not deliverables.

---

## 2. Color

A near-black field, one cyan signal, one violet for the AI moments. The violet
("Plasma") is the deliberate departure from the generic black-and-cyan crypto
look — use it sparingly, as a single accent, never as a second primary.

| Token | Name | Hex | HSL | Role |
|---|---|---|---|---|
| `--void` | **Void** | `#070A0F` | `220 15% 4%` | Page background |
| `--abyss` | **Abyss** | `#0C1118` | `220 15% 7%` | Cards / surfaces |
| `--neuro` | **Neuro Cyan** | `#16E0EE` | `187 90% 51%` | Primary signal, CTAs |
| `--synapse` | **Synapse Blue** | `#1AA6F5` | `199 89% 53%` | Gradient partner |
| `--plasma` | **Plasma** | `#7C5CFF` | `252 100% 68%` | AI / accent (sparingly) |
| `--mint` | **Mint Signal** | `#34E5B0` | `160 72% 55%` | Yield / success |
| `--ion` | **Ion** | `#EAF6F9` | `190 50% 95%` | Primary text |
| `--mute` | **Mute** | `#5FB8C8` | `192 42% 58%` | Captions, eyebrows |

**Signature gradient** — `linear-gradient(135deg, #16E0EE 0%, #1AA6F5 100%)`.
Applied bottom-left → top-right so any waveform/bar reads as *ascending*.

Contrast: Ion on Void ≈ 17:1, Neuro Cyan on Void ≈ 11:1 — both clear AA/AAA.
Never set Neuro Cyan as a text color on light backgrounds; use `#0FB9C8`.

---

## 3. Typography

A characterful geometric display, a neutral workhorse body, a mono for the data
NEURO is built on. Three roles, no improvising a fourth.

| Role | Typeface | Usage |
|---|---|---|
| **Display** | Space Grotesk (700 / 500) | Wordmark, H1–H2, big moments. Tight tracking. |
| **Body** | Inter (400 / 600) | UI, paragraphs, labels. |
| **Data / mono** | JetBrains Mono (500) | Numbers, addresses, eyebrows, code. Letter-spaced when used as a label. |

Rules of thumb: display only above ~28px; never set body copy in Space Grotesk;
mono eyebrows are UPPERCASE with `5–7` letter-spacing. The wordmark always ends
on a **cyan "O"** — the one letter that ties the type back to the mark.

---

## 4. Voice & tone

NEURO speaks the way it asks you to speak to it: short, certain, useful.

- **Calm, not loud.** "Your voice. Smart risk. Real yield." not "🚀 The FUTURE of DeFi!!!"
- **Active and specific.** "Move 300 USDC to Solana." not "Initiate a transfer."
- **Honest at the edges.** Errors say what broke and the next move — they don't apologize or go vague. Empty states invite an action.
- **It never custodies, and it says so.** Trust is a feature; state plainly that the user signs.

**Taglines** — primary: *Your voice. Smart risk. Real yield.*
The three pillars map 1:1 to the product: **your voice** (ElevenLabs conversational
control) · **smart risk** (on-chain risk scoring, 0–100) · **real yield** (live,
risk-adjusted APY across Kamino, Drift, MarginFi, Jito).
Support lines: *Speak a command — NEURO scores risk, earns yield.* · *Talk to
your money. It earns, risk in check.*

---

## 5. Clear space & don't

- Keep clear space of **one bar-height** of the mark around all sides of any logo.
- Minimum mark size: 24px (favicon) / lockup: 120px wide.
- **Don't** recolor the mark outside the cyan→blue gradient (+ the single violet node).
- **Don't** stretch, rotate, add a drop shadow, or place the dark lockup on a busy/light photo — switch to the light lockup or the solid app icon.
- **Don't** rebuild the waveform with equal-height bars; the rising profile *is* the brand.

---

*Tokens mirror the live design system in [`src/index.css`](../../index.css) and
[`tailwind.config.js`](../../../tailwind.config.js). The mark, palette and type
here are the canonical source for anything outside the app (decks, social, store).*
