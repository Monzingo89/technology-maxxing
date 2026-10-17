# Video and voice choices

Checked October 17, 2026 against the providers' documentation.

The implemented pipeline uses **two keys**: Gemini for explanatory visual scenes
and ElevenLabs for narration. Captions and 30-second assembly are local backend
processing, requiring no third paid API. Eleven v4 is now the default speech model;
it uses the [Text to Dialogue endpoint](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert).
The model is speech-only, not a video or avatar generator. See the
[model list](https://elevenlabs.io/docs/overview/models).

An alternative can use **one ElevenLabs account/key**, but still distinct models
and calls: its [Image & Video API](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/image-and-video)
requires Pro or above and Image & Video or Flows key permissions. The
[video API](https://elevenlabs.io/docs/api-reference/flows/video/create)
lists Veo visual models and Creatify Aurora for audio-driven presenter animation.
That alternative adapter and a presenter layer are **not implemented** here.
The separate reusable [Avatars product](https://elevenlabs.io/docs/overview/capabilities/image-video/avatars)
currently says API access is unavailable; do not confuse it with Aurora API access.

For explanations, prioritize diagrams and visual mechanisms. A presenter can be
an optional short introduction or small inset, not a substitute for the diagrams.
All output requires review for factual accuracy, pronunciation, timing, and visual
clarity before publication. Credits do not guarantee account-level model access.
