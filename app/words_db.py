import json
import os
import sys
from typing import List, Dict, Any, Optional

def kanaToHiragana(text: str) -> str:
    """Converts katakana characters to hiragana."""
    katakana_to_hiragana_map = {
        'ア': 'あ', 'イ': 'い', 'ウ': 'う', 'エ': 'え', 'オ': 'お',
        'カ': 'か', 'キ': 'き', 'ク': 'く', 'ケ': 'け', 'コ': 'こ',
        'サ': 'さ', 'シ': 'し', 'ス': 'す', 'セ': 'せ', 'ソ': 'そ',
        'タ': 'た', 'チ': 'ち', 'ツ': 'つ', 'テ': 'て', 'ト': 'と',
        'ナ': 'な', 'ニ': 'に', 'ヌ': 'ぬ', 'ネ': 'ね', 'ノ': 'の',
        'ハ': 'は', 'ヒ': 'ひ', 'フ': 'ふ', 'ヘ': 'へ', 'ホ': 'ほ',
        'マ': 'ま', 'ミ': 'み', 'ム': 'む', 'メ': 'め', 'モ': 'も',
        'ヤ': 'や', 'ユ': 'ゆ', 'ヨ': 'よ',
        'ラ': 'ら', 'リ': 'り', 'ル': 'る', 'レ': 'れ', 'ロ': 'ろ',
        'ワ': 'わ', 'ヲ': 'を', 'ン': 'ん',
        'ガ': 'が', 'ギ': 'ぎ', 'グ': 'ぐ', 'ゲ': 'げ', 'ゴ': 'ご',
        'ザ': 'ざ', 'ジ': 'じ', 'ズ': 'ず', 'ゼ': 'ぜ', 'ゾ': 'ぞ',
        'ダ': 'だ', 'ヂ': 'ぢ', 'ヅ': 'づ', 'デ': 'で', 'ド': 'ど',
        'バ': 'ば', 'ビ': 'び', 'ブ': 'ぶ', 'ベ': 'べ', 'ボ': 'ぼ',
        'パ': 'ぱ', 'ピ': 'ぴ', 'プ': 'ぷ', 'ペ': 'ぺ', 'ポ': 'ぽ',
        'ァ': 'ぁ', 'ィ': 'ぃ', 'ゥ': 'ぅ', 'ェ': 'ぇ', 'ォ': 'ぉ',
        'ャ': 'ゃ', 'ュ': 'ゅ', 'ョ': 'ょ',
        'ッ': 'っ', 'ー': 'ー'
    }
    return ''.join(katakana_to_hiragana_map.get(c, c) for c in text)

class FlatFileDatabase:
    def __init__(self, data_file_path: str, index_file_path: str):
        self.data_file_path = data_file_path
        self.index_file_path = index_file_path
        self.word_index = {}
        self.lookup_cache = {}

    def generate_index(self):
        print("Generating a new index file...")
        index = {}
        current_offset = 0

        if not os.path.exists(self.data_file_path) or os.path.getsize(self.data_file_path) == 0:
            raise FileNotFoundError(f"Error: Data file '{self.data_file_path}' not found or is empty.")

        lines_processed = 0
        keys_indexed = 0

        try:
            with open(self.data_file_path, 'rb') as f:
                while True:
                    line_bytes = f.readline()
                    if not line_bytes:
                        break

                    lines_processed += 1
                    line = line_bytes.decode('utf-8', errors='ignore').strip()

                    if not line:
                        current_offset += len(line_bytes)
                        continue

                    try:
                        record = json.loads(line)
                        kanji_raw = record.get('k', [])
                        readings_raw = record.get('r', [])

                        if isinstance(kanji_raw, str):
                            kanji_raw = [kanji_raw]
                        if isinstance(readings_raw, str):
                            readings_raw = [readings_raw]

                        kanji_keys = [kanaToHiragana(k) for k in kanji_raw if k]
                        reading_keys = [kanaToHiragana(r) for r in readings_raw if r]

                        keys = kanji_keys + reading_keys

                        for key in keys:
                            keys_indexed += 1
                            if key not in index:
                                index[key] = []
                            index[key].append(current_offset)

                    except json.JSONDecodeError as e:
                        print(f"Skipping malformed line at offset {current_offset}: {e}")
                    except Exception as e:
                        print(f"Skipping record at offset {current_offset} due to error: {e}")

                    current_offset += len(line_bytes)

            with open(self.index_file_path, 'w', encoding='utf-8') as f:
                sorted_keys = sorted(index.keys())
                for key in sorted_keys:
                    offsets = [str(o) for o in index[key]]
                    f.write(f"{key},{','.join(offsets)}\n")

            print(f"Finished processing. Total lines read: {lines_processed}, Total keys indexed: {keys_indexed}")
            print(f"Index generated successfully with {len(index)} unique keys.")

        except FileNotFoundError as e:
            raise e
        except Exception as e:
            raise Exception(f"An error occurred during index generation: {e}")

    def load_data(self):
        if not os.path.exists(self.index_file_path):
            self.generate_index()

        lines_read = 0
        entries_loaded = 0
        try:
            with open(self.index_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    lines_read += 1
                    parts = line.strip().split(',', 1)

                    if len(parts) == 2:
                        key, offsets_str = parts

                        try:
                            self.word_index[key] = [int(o) for o in offsets_str.split(',')]
                            entries_loaded += 1
                        except ValueError:
                            pass
                    else:
                        pass

        except FileNotFoundError as e:
            raise e
        except Exception as e:
            raise Exception(f"An error occurred during data loading: {e}")

    def get_words(self, input_text: str) -> List[Dict[str, Any]]:
        search_term = kanaToHiragana(input_text)

        offsets = self.word_index.get(search_term, [])
        if not offsets:
            return []

        results = []
        try:
            with open(self.data_file_path, 'rb') as f:
                for offset in offsets:
                    f.seek(offset)
                    line_bytes = f.readline()
                    line = line_bytes.decode('utf-8').strip()

                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        results.append(entry)
                    except json.JSONDecodeError:
                        pass
        except Exception:
            pass

        return results
