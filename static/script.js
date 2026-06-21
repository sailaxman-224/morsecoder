const swapBtn = document.getElementById('swapBtn');
const modeStatus = document.getElementById('modeStatus');
const inputLabel = document.getElementById('inputLabel');
const outputLabel = document.getElementById('outputLabel');
const userInput = document.getElementById('user_input');
const outputResult = document.getElementById('output_result');
const samplePhrasesContainer = document.getElementById('samplePhrasesContainer');
const panelDropdown = document.getElementById('panelDropdown');
const titleSwapBtn = document.getElementById('titleSwapBtn');
const mainTitle = document.getElementById('mainTitle');
const smartAudioBtn = document.getElementById('smartAudioBtn');
const micBtn = document.getElementById('micBtn');
const historyLogContainer = document.getElementById('historyLogContainer');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let activeAudioCtx = null;
let activeOscillators = [];
let activeSpeechUtterance = null;
let saveDebounceTimeout = null;

// Load stored logs immediately when the document window initializes
document.addEventListener('DOMContentLoaded', renderHistory);

// --- 1. Dynamic UI Swap & Side Panel Visibility ---
swapBtn.addEventListener('click', () => {
    if (modeStatus.value === 'encode') {
        modeStatus.value = 'decode';
        swapBtn.innerHTML = '⇆ Switch: Morse to Text';
        inputLabel.innerHTML = 'Morse Code Input:';
        outputLabel.innerHTML = 'English Text Output:';
        userInput.placeholder = 'Type Morse code here (e.g., .... . -.--)...';
        samplePhrasesContainer.classList.remove('hidden');
    } else {
        modeStatus.value = 'encode';
        swapBtn.innerHTML = '⇆ Switch: Text to Morse';
        inputLabel.innerHTML = 'English Text Input:';
        outputLabel.innerHTML = 'Morse Code Output:';
        userInput.placeholder = 'Type English text here...';
        samplePhrasesContainer.classList.add('hidden');
    }
    userInput.value = '';
    outputResult.value = '';
    stopAllAudio();
});

// --- 2. Real-Time Translation Engine (AJAX Fetch) ---
function triggerTranslation() {
    const textValue = userInput.value;
    const targetLangDropdown = document.getElementById('targetLangDropdown');

    if (textValue.trim() === '') {
        outputResult.value = '';
        return;
    }

    fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_input: textValue,
            mode: modeStatus.value,
            target_lang: targetLangDropdown ? targetLangDropdown.value : 'english'
        })
    })
    .then(response => response.text())
    .then(translation => { 
        outputResult.value = translation; 
        
        // DEBOUNCE LOGGING: Wait for the user to stop typing for 1.5 seconds before committing to history
        clearTimeout(saveDebounceTimeout);
        saveDebounceTimeout = setTimeout(() => {
            saveToLocalStorage(textValue, translation, modeStatus.value, targetLangDropdown ? targetLangDropdown.value : 'english');
        }, 1500);
    })
    .catch(error => console.error('API Translation Error:', error));
}

userInput.addEventListener('input', triggerTranslation);

if (document.getElementById('targetLangDropdown')) {
    document.getElementById('targetLangDropdown').addEventListener('change', triggerTranslation);
}

// --- 3. Compact Dropdown Auto-Fill Logic ---
if (panelDropdown) {
    panelDropdown.addEventListener('change', () => {
        const selectedMorse = panelDropdown.value;
        if (selectedMorse) {
            userInput.value = selectedMorse;
            userInput.dispatchEvent(new Event('input'));
            panelDropdown.value = "";
        }
    });
}

// --- 4. Title Interactive Toggle Logic ---
if (titleSwapBtn && mainTitle) {
    titleSwapBtn.addEventListener('click', () => {
        if (mainTitle.innerHTML === '-- --- .-. ... . -.-. --- -.. . .-.') {
            mainTitle.innerHTML = 'MORSECODER';
        } else {
            mainTitle.innerHTML = '-- --- .-. ... . -.-. --- -.. . .-.';
        }
    });
}

// --- 5. Privacy-Focused LocalStorage Data Engine ---
function saveToLocalStorage(input, output, mode, lang) {
    if (!input.trim() || !output.trim()) return;

    let history = JSON.parse(localStorage.getItem('morse_history')) || [];

    // Skip duplicating logs if the exact same translation was just written
    if (history.length > 0 && history[0].input === input && history[0].output === output) return;

    const logEntry = {
        input: input,
        output: output,
        mode: mode === 'encode' ? 'Text ➔ Morse' : 'Morse ➔ Text',
        lang: lang.toUpperCase(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    history.unshift(logEntry); // Push newest entries to the top
    if (history.length > 10) history.pop(); // Cap history pool at 10 items to prevent bloat

    localStorage.setItem('morse_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem('morse_history')) || [];
    
    if (history.length === 0) {
        historyLogContainer.innerHTML = '<p class="empty-log-msg">No recent translations logged on this device.</p>';
        return;
    }

    historyLogContainer.innerHTML = history.map(entry => `
        <div class="history-card">
            <div class="data-block">
                <strong>Source</strong>
                <span>${entry.input}</span>
            </div>
            <div class="data-block">
                <strong>Translation</strong>
                <span>${entry.output}</span>
            </div>
            <div>
                <span class="history-tag">${entry.mode} [${entry.lang}]</span>
            </div>
        </div>
    `).join('');
}

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('morse_history');
    renderHistory();
});

// --- 6. The Unified Smart Audio Controller Engine ---
if (smartAudioBtn) {
    smartAudioBtn.addEventListener('click', () => {
        if ((activeAudioCtx && activeAudioCtx.state !== 'closed') || (window.speechSynthesis && window.speechSynthesis.speaking)) {
            stopAllAudio();
            return;
        }
        const outputValue = outputResult.value.trim();
        if (!outputValue) return;

        if (modeStatus.value === 'encode') {
            playMorseWaves(outputValue);
        } else {
            playTextSpeech(outputValue);
        }
    });
}

// Logic Block for Synthesizing Morse Radio Wave Signalling via Web Audio API
function playMorseWaves(morseCode) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return alert("Your browser doesn't support Web Audio API");
    
    activeAudioCtx = new AudioContext();
    const beacon = document.getElementById('visualBeacon');
    let currentTime = activeAudioCtx.currentTime;

    const dotDuration = 0.1;           
    const dashDuration = dotDuration * 3; 
    const toneFrequency = 600;         

    setSmartButtonToStopState();

    // Force clear any hanging styles before starting the transmission loop
    if (beacon) beacon.style.backgroundColor = '#cbd5e1';

    morseCode.split('').forEach(symbol => {
        if (symbol === '.' || symbol === '-') {
            const duration = (symbol === '.') ? dotDuration : dashDuration;

            const oscillator = activeAudioCtx.createOscillator();
            const gainNode = activeAudioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = toneFrequency;

            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(1, currentTime + 0.005);
            gainNode.gain.setValueAtTime(1, currentTime + duration);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration + 0.005);

            oscillator.connect(gainNode);
            gainNode.connect(activeAudioCtx.destination);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration + 0.01);
            activeOscillators.push(oscillator);

            // --- FIXED RELIABLE VISUAL SIGNALLING TIMING ---
            // Calculate the absolute delay from the exact millisecond the user clicked "Listen"
            const delayStartMs = (currentTime - activeAudioCtx.currentTime) * 1000;
            const delayStopMs = (currentTime + duration - activeAudioCtx.currentTime) * 1000;

            setTimeout(() => {
                if (activeAudioCtx && beacon) {
                    beacon.style.setProperty('background-color', '#fbbf24', 'important');
                }
            }, delayStartMs);

            setTimeout(() => {
                if (beacon) {
                    beacon.style.setProperty('background-color', '#cbd5e1', 'important');
                }
            }, delayStopMs);

            currentTime += duration + dotDuration;
        } else if (symbol === ' ') {
            currentTime += dotDuration * 2;
        } else if (symbol === '/') {
            currentTime += dotDuration * 4;
        }
    });

    const totalDurationMs = (currentTime - activeAudioCtx.currentTime) * 1000;
    setTimeout(() => { 
        if (activeAudioCtx) {
            resetSmartButtonUI();
            if (beacon) beacon.style.setProperty('background-color', '#cbd5e1', 'important');
        }
    }, totalDurationMs);
}
function playTextSpeech(textToSpeak) {
    activeSpeechUtterance = new SpeechSynthesisUtterance(textToSpeak);
    
    const langMapping = {
        'english': 'en-US',
        'hindi': 'hi-IN',
        'telugu': 'te-IN',
        'spanish': 'es-ES',
        'french': 'fr-FR',
        'german': 'de-DE'
    };

    const targetLangDropdown = document.getElementById('targetLangDropdown');
    const selectedLangKey = targetLangDropdown ? targetLangDropdown.value : 'english';
    activeSpeechUtterance.lang = langMapping[selectedLangKey] || 'en-US';

    setSmartButtonToStopState();
    activeSpeechUtterance.onend = () => { resetSmartButtonUI(); };
    window.speechSynthesis.speak(activeSpeechUtterance);
}

function setSmartButtonToStopState() {
    smartAudioBtn.innerHTML = '🛑 Stop Sound';
    smartAudioBtn.style.borderColor = '#dc3545';
    smartAudioBtn.style.color = '#dc3545';
}

function resetSmartButtonUI() {
    smartAudioBtn.innerHTML = '🔊 Listen';
    smartAudioBtn.style.borderColor = '#007bff';
    smartAudioBtn.style.color = '#007bff';
}

function stopAllAudio() {
    if (activeOscillators.length > 0) {
        activeOscillators.forEach(osc => { try { osc.stop(); } catch(e){} });
        activeOscillators = [];
    }
    if (activeAudioCtx) {
        activeAudioCtx.close();
        activeAudioCtx = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    resetSmartButtonUI();
}

// --- 7. Voice Dictation Engine ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition && micBtn) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('recording')) {
            recognition.stop();
            return;
        }
        stopAllAudio();
        recognition.start();
    });

    recognition.onstart = () => {
        micBtn.classList.add('recording');
        micBtn.innerHTML = '🛑 Listening...';
        micBtn.style.backgroundColor = '#28a745';
        micBtn.style.color = 'white';
    };

    recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        userInput.dispatchEvent(new Event('input'));
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
        micBtn.innerHTML = '🎤 Speak';
        micBtn.style.backgroundColor = 'white';
        micBtn.style.color = '#28a745';
    };
} else if (micBtn) {
    micBtn.style.display = 'none';
}