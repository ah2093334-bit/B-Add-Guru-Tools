PRIVATE LOCAL ENGINE — DO NOT UPLOAD THIS FOLDER TO A PUBLIC GITHUB REPOSITORY.

What works now:
- Detects Windows GPU/RAM/CPU.
- Automatically selects local realistic eligibility only for NVIDIA CUDA with >=8 GB VRAM.
- Automatically falls back to whiteboard/local rendering on unsupported hardware.
- Creates local whiteboard scene visuals with Pillow.
- Creates free local Windows TTS narration.
- Renders MP4 with FFmpeg.
- Generates bulk local whiteboard/topic-card images.
- Uses ZERO cloud video credits for these local operations.

Important:
- Heavy realistic local video model weights are NOT included. They are many GB and cannot be honestly bundled in this small website ZIP.
- When a supported NVIDIA machine is available, install a compatible local model/backend in this private engine and keep the website model selector hidden.
- Intel UHD 620 is expected to fall back to whiteboard/local editor mode.
