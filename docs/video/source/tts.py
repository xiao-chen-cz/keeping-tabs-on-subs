import os, sys, espeakng_loader, soundfile as sf
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library("/opt/homebrew/lib/libespeak-ng.dylib")
EspeakWrapper.set_data_path("/opt/homebrew/share/espeak-ng-data")
from kokoro_onnx import Kokoro
from kokoro_onnx.config import EspeakConfig
tts = os.path.expanduser("~/.cache/hyperframes/tts")
k = Kokoro(f"{tts}/models/kokoro-v1.0.onnx", f"{tts}/voices/voices-v1.0.bin", espeak_config=EspeakConfig(lib_path="/opt/homebrew/lib/libespeak-ng.dylib", data_path="/opt/homebrew/share/espeak-ng-data"))
text, voice, out = sys.argv[1], sys.argv[2], sys.argv[3]
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
lang = "en-gb" if voice.startswith("b") else "en-us"
samples, sr = k.create(text, voice=voice, speed=speed, lang=lang)
sf.write(out, samples, sr)
print(out, round(len(samples) / sr, 2), "s")
