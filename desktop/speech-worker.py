import json, sys, os
from faster_whisper import WhisperModel

model_path, audio_path, output_path, vocabulary = sys.argv[1:5]
model = WhisperModel(model_path, device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
segments, info = model.transcribe(audio_path, beam_size=3, vad_filter=True, initial_prompt=vocabulary or None, condition_on_previous_text=False)
result = {'language': info.language, 'segments': []}
for segment in segments:
    result['segments'].append({'start': segment.start, 'end': segment.end, 'text': segment.text.strip()})
    print('SEGMENT', flush=True)
with open(output_path + '.tmp', 'w', encoding='utf-8') as output:
    json.dump(result, output, ensure_ascii=False)
os.replace(output_path + '.tmp', output_path)
