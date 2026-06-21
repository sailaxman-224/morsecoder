// =========================================================================
// 1. DOM ELEMENT REFERENCES
// =========================================================================
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

// =========================================================================
// 2. GLOBAL TIMING & AUDIO TRACKING ENGINE STATE
// =========================================================================
let activeAudioCtx = null;
let activeOscillators = [];
let activeSpeechUtterance = null;
let saveDebounceTimeout = null;

// Load any previously saved browser history items immediately when page boots up
document.addEventListener('DOMContentLoaded', renderHistory);

/// =========================================================================
// 3. DYNAMIC WORKSPACE UI TOGGLE SWAP
// =========================================================================
swapBtn.addEventListener('click', () => {
    const secretKeyInput = document.getElementById('secretKeyInput');

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
    
    // Clear the workspaces completely
    userInput.value = '';
    outputResult.value = '';
    
    // --- FIX: Instantly flush the cryptographic key variable out of the DOM ---
    if (secretKeyInput) {
        secretKeyInput.value = '';
    }
    
    stopAllAudio(); // Clear hanging frequencies if mode flips mid-stream
});
// =========================================================================
// 4. REAL-TIME ASYNCHRONOUS TRANSLATION PIPELINE (AJAX FETCH)
// =========================================================================
function triggerTranslation() {
    const textValue = userInput.value;
    const targetLangDropdown = document.getElementById('targetLangDropdown');
    const secretKeyInput = document.getElementById('secretKeyInput');

    if (textValue.trim() === '') {
        outputResult.value = '';
        return;
    }

    // Securely fallback to an empty string if element is not rendering properly
    const keyValue = secretKeyInput ? secretKeyInput.value : '';

    fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_input: textValue,
            mode: modeStatus.value,
            target_lang: targetLangDropdown ? targetLangDropdown.value : 'english',
            secret_key: keyValue
        })
    })
    .then(response => response.text())
    .then(translation => { 
        outputResult.value = translation; 
        
        // DEBOUNCE LOGGER: Clear previous timer and trigger save 1.5s after user stops typing
        clearTimeout(saveDebounceTimeout);
        saveDebounceTimeout = setTimeout(() => {
            saveToLocalStorage(textValue, translation, modeStatus.value, targetLangDropdown ? targetLangDropdown.value : 'english');
        }, 1500);
    })
    .catch(error => console.error('API Translation System Error:', error));
}

// Attach translation triggers to user typing input changes
userInput.addEventListener('input', triggerTranslation);

if (document.getElementById('targetLangDropdown')) {
    document.getElementById('targetLangDropdown').addEventListener('change', triggerTranslation);
}
if (document.getElementById('secretKeyInput')) {
    document.getElementById('secretKeyInput').addEventListener('input', triggerTranslation);
}

// =========================================================================
// 5. AUTOFILL SELECTORS & CUSTOM TITLES LOGIC
// =========================================================================
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

if (titleSwapBtn && mainTitle) {
    titleSwapBtn.addEventListener('click', () => {
        if (mainTitle.innerHTML === '-- --- .-. ... . -.-. --- -.. . .-.') {
            mainTitle.innerHTML = 'MORSECODER';
        } else {
            mainTitle.innerHTML = '-- --- .-. ... . -.-. --- -.. . .-.';
        }
    });
}

// =========================================================================
// CLIPBOARD COPY INFRASTRUCTURE
// =========================================================================
const copyBtn = document.getElementById('copyBtn');

if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        const textToCopy = outputResult.value;
        
        // Block actions if the target payload workspace is completely empty
        if (!textToCopy.trim()) return;

        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                // UI feedback signaling successful data execution
                copyBtn.innerHTML = '✓ Copied!';
                copyBtn.style.borderColor = '#28a745';
                copyBtn.style.color = '#28a745';

                // Revert look back to baseline standard options after a 1.2s delay frame
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 Copy';
                    copyBtn.style.borderColor = '#6c757d';
                    copyBtn.style.color = '#6c757d';
                }, 1200);
            })
            .catch(err => {
                console.error('Clipboard pipeline execution failure:', err);
            });
    });
}   

// =========================================================================
// 6. LOCAL DEVICE DATA STORAGE RESIDENCY MANAGEMENT (HISTORY LOG)
// =========================================================================
function saveToLocalStorage(input, output, mode, lang) {
    if (!input.trim() || !output.trim()) return;
    let history = JSON.parse(localStorage.getItem('morse_history')) || [];
    
    // Prevent recording duplications if user is sitting idling on single string
    if (history.length > 0 && history[0].input === input && history[0].output === output) return;

    const logEntry = {
        input: input,
        output: output,
        mode: mode === 'encode' ? 'Text ➔ Morse' : 'Morse ➔ Text',
        lang: lang.toUpperCase()
    };
    
    history.unshift(logEntry); // Pin fresh log to top of index
    if (history.length > 10) history.pop(); // Keep index depth limited to 10 nodes max
    
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
            <div class="data-block"><strong>Source</strong><span>${entry.input}</span></div>
            <div class="data-block"><strong>Translation</strong><span>${entry.output}</span></div>
            <div><span class="history-tag">${entry.mode} [${entry.lang}]</span></div>
        </div>
    `).join('');
}

clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem('morse_history');
    renderHistory();
});

// =========================================================================
// 7. SMART CONTEXT AUDIO SYNTHESIZER WITH TIMED VISUAL BEACON SIGNALS
// =========================================================================
if (smartAudioBtn) {
    smartAudioBtn.addEventListener('click', () => {
        // KILL SWITCH: If sound or speech is actively processing, clear it instantly
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

            // Compute precision latency window based on Audio card scheduler timeline
            const delayStartMs = (currentTime - activeAudioCtx.currentTime) * 1000;
            const delayStopMs = (currentTime + duration - activeAudioCtx.currentTime) * 1000;

            // Trigger light indicators instantly via engine time frames
            setTimeout(() => { if (activeAudioCtx && beacon) beacon.style.setProperty('background-color', '#fbbf24', 'important'); }, delayStartMs);
            setTimeout(() => { if (beacon) beacon.style.setProperty('background-color', '#cbd5e1', 'important'); }, delayStopMs);

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
    const langMapping = { 'english': 'en-US', 'hindi': 'hi-IN', 'telugu': 'te-IN', 'spanish': 'es-ES', 'french': 'fr-FR', 'german': 'de-DE' };
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

// =========================================================================
// 8. VOICE DICTATION INTEGRATION CAPTURE MODULE (MICROPHONE FEEDSTREAMS)
// =========================================================================
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
        userInput.dispatchEvent(new Event('input')); // Instant trigger real-time encryption/translation sequence
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