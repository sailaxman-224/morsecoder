import os
from flask import Flask, render_template, request
from deep_translator import GoogleTranslator

MORSE_CODE_DICT = { 
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': '/', '!': '-.-.--', '?': '..--..',
    '.': '.-.-.-', ',': '--..--', ':': '---...', ';': '-.-.-.', '-': '-....-',
    '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.', '(': '-.--.',
    ')': '-.--.-', '&': '.-...', "'": '.----.', '/': '-..-.', '+': '.-.-.',
    '=': '-...-'    
}

def vigenere_encrypt(plaintext, key):
    # If key is empty, null, or just spaces, skip encryption entirely
    if not key or not key.strip():
        return plaintext
    key = key.strip().upper()
    ciphertext = []
    key_index = 0
    
    for char in plaintext.upper():
        if char.isalpha():
            shift = ord(key[key_index % len(key)]) - 65
            encrypted_char = chr((ord(char) - 65 + shift) % 26 + 65)
            ciphertext.append(encrypted_char)
            key_index += 1
        else:
            ciphertext.append(char)
            
    return "".join(ciphertext)

def vigenere_decrypt(ciphertext, key):
    if not key or not key.strip():
        return ciphertext
    key = key.strip().upper()
    plaintext = []
    key_index = 0
    
    for char in ciphertext.upper():
        if char.isalpha():
            shift = ord(key[key_index % len(key)]) - 65
            dec_char = chr((ord(char) - 65 - shift + 26) % 26 + 65)
            plaintext.append(dec_char)
            key_index += 1
        else:
            plaintext.append(char)
            
    return "".join(plaintext)

def encode(message):
    encoded_tokens = []
    for char in message.upper():
        if char in MORSE_CODE_DICT:
            encoded_tokens.append(MORSE_CODE_DICT[char])
        else:
            encoded_tokens.append('?') 
    return ' '.join(encoded_tokens)

def decode(encoded_message):
    rev_dict = {v: k for k, v in MORSE_CODE_DICT.items()}
    decoded_words = []
    morse_words = encoded_message.split(' / ')
    
    for word in morse_words:
        decoded_letters = []
        for code in word.split(' '):
            if code in rev_dict:
                decoded_letters.append(rev_dict[code])
            else:
                decoded_letters.append('?')
        decoded_words.append("".join(decoded_letters))
        
    return ' '.join(decoded_words)

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html", result="", user_input="")

@app.route("/api/translate", methods=["POST"])
def api_translate():
    data = request.get_json() or {}
    user_input = data.get("user_input", "")
    mode = data.get("mode", "encode")
    target_lang = data.get("target_lang", "english")
    secret_key = data.get("secret_key", "")
    
    if mode == "encode":
        encrypted_text = vigenere_encrypt(user_input, secret_key)
        result = encode(encrypted_text)
    else:
        decoded_english = decode(user_input)
        decrypted_text = vigenere_decrypt(decoded_english, secret_key)
        
        if target_lang != "english" and decrypted_text.strip() != "":
            try:
                result = GoogleTranslator(source='auto', target=target_lang).translate(decrypted_text)
            except Exception as e:
                result = f"[Translation Error: {str(e)}]"
        else:
            result = decrypted_text
        
    return result

if __name__ == "__main__":
    # Force explicit binding to standard local development loops to bypass connection blocks
    app.run(host="127.0.0.1", port=5000, debug=True)