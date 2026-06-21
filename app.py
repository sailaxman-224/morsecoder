from flask import Flask, render_template, request  # Added 'request' here
from deep_translator import GoogleTranslator
# MORSE_CODE_DICT here
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
# encode() function here
def encode(message):
    encoded_tokens = []
    
    for char in message.upper():
        if char in MORSE_CODE_DICT:
            encoded_tokens.append(MORSE_CODE_DICT[char])
        else:
            # Keeps the output clean without breaking the structure
            encoded_tokens.append('?') 
            
    # This automatically puts exactly one space between every Morse token
    return ' '.join(encoded_tokens)
#decode() function here
def decode(encoded_message):
    # 1. High-speed O(1) reverse lookup table
    rev_dict = {v: k for k, v in MORSE_CODE_DICT.items()}
    decoded_words = []
    
    # 2. Isolate individual words by splitting at the ' / ' boundary
    morse_words = encoded_message.split(' / ')
    
    for word in morse_words:
        decoded_letters = []  # Temporary collector for characters of the current word
        
        # 3. Isolate individual letters by splitting at spaces
        for code in word.split(' '):
            if code in rev_dict:
                decoded_letters.append(rev_dict[code])
            else:
                decoded_letters.append('?')  # Graceful placeholder for corrupt data
        
        # Assemble characters into a single word and save it
        decoded_words.append("".join(decoded_letters))
        
    # 4. Reconstruct the final sentence with proper spaces between words
    return ' '.join(decoded_words)

app = Flask(__name__)
# --- CRITICAL: The Browser Landing Page Route ---
@app.route("/")
def home():
    # This serves the structural index.html framework to the user's browser initially
    return render_template("index.html", result="", user_input="")

# --- The Asynchronous Background API Endpoint ---

@app.route("/api/translate", methods=["POST"])
def api_translate():
    data = request.get_json() or {}
    user_input = data.get("user_input", "")
    mode = data.get("mode", "encode")
    target_lang = data.get("target_lang", "english") # Grab the target language string
    
    if mode == "encode":
        result = encode(user_input)
    else:
        # First, decode the Morse tokens back into plain English text
        decoded_english = decode(user_input)
        
        # If a language other than English is picked, route it through the Google translator engine
        if target_lang != "english" and decoded_english.strip() != "":
            try:
                result = GoogleTranslator(source='auto', target=target_lang).translate(decoded_english)
            except Exception as e:
                result = f"[Translation Error: {str(e)}]"
        else:
            result = decoded_english
        
    return result

if __name__ == "__main__":
    app.run(debug=True)