# Dictation UX — SelahKeep

## Flow

**Dictate → Recording → Stop → Review → Insert / Discard**

1. User opens dictation from the editor section
2. **Record** captures audio locally (AudioWorklet + Whisper worker)
3. **Stop** runs final on-device transcription
4. **Review** shows editable transcript (`Review before inserting`)
5. **Insert into note** or **Discard**

## Privacy

- **No** cloud Web Speech API for note content
- **No** server upload of audio or transcript
- One-time model weight download (disclosed in panel); cached locally
- Transcript cleared on **vault lock** (`subscribeVaultSession`)

## Status labels

| Label | Meaning |
|-------|---------|
| Ready | Panel open, idle |
| Recording | Mic active, live partial transcript |
| Processing | Final transcription pass |
| Review | Transcript ready for edit/insert |
| Unavailable | Browser unsupported or error |

Feature flag: `NEXT_PUBLIC_VOICE_NOTES_ENABLED`

See `docs/TDR_Local_Voice_Notes.md`.
