const swapBtn = document.getElementById('swapBtn');
const modeStatus = document.getElementById('modeStatus');
const inputLabel = document.getElementById('inputLabel');
const outputLabel = document.getElementById('outputLabel');
const userInput = document.getElementById('user_input');
const outputResult = document.getElementById('output_result');
const samplePhrasesContainer = document.getElementById('samplePhrasesContainer');
const sampleButtons = document.querySelectorAll('.sample-item-btn');

// --- 1. Dynamic UI Swap & Side Panel Visibility ---
swapBtn.addEventListener('click', () => {
    if (modeStatus.value === 'encode') {
        modeStatus.value = 'decode';
        swapBtn.innerHTML = '⇆ Switch: Morse to Text';
        inputLabel.innerHTML = 'Morse Code Input:';
        outputLabel.innerHTML = 'English Text Output:';
        userInput.placeholder = 'Type Morse code here (e.g., .... . -.--)...';
        
        // Dynamic visibility shift: Reveal the left panel on decode mode
        samplePhrasesContainer.classList.remove('hidden');
    } else {
        modeStatus.value = 'encode';
        swapBtn.innerHTML = '⇆ Switch: Text to Morse';
        inputLabel.innerHTML = 'English Text Input:';
        outputLabel.innerHTML = 'Morse Code Output:';
        userInput.placeholder = 'Type English text here...';
        
        // Hide it cleanly when typing standard English text
        samplePhrasesContainer.classList.add('hidden');
    }
    userInput.value = '';
    outputResult.value = '';
});

// --- 2. Real-Time Translation Engine (AJAX Fetch) ---
        // Create a separate function so we can call it whenever input OR language changes
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
                    target_lang: targetLangDropdown ? targetLangDropdown.value : 'english' // Send chosen language
                })
            })
            .then(response => response.text())
            .then(translation => { outputResult.value = translation; })
            .catch(error => console.error('API Translation Error:', error));
        }

        // Listen for typing inputs
        userInput.addEventListener('input', triggerTranslation);

        // Also listen for language dropdown changes so it translates instantly if the language shifts!
        document.getElementById('targetLangDropdown').addEventListener('change', triggerTranslation);
// --- 3. Compact Dropdown Auto-Fill Logic ---
const panelDropdown = document.getElementById('panelDropdown');

panelDropdown.addEventListener('change', () => {
    // Read the selected option's value (the Morse code tokens)
    const selectedMorse = panelDropdown.value;
    
    if (selectedMorse) {
        userInput.value = selectedMorse;
        userInput.dispatchEvent(new Event('input')); // Spin up real-time translation
        
        // Optional: Reset the dropdown selection view back to the placeholder
        panelDropdown.value = "";
    }
});


// --- 4. Title Interactive Toggle Logic ---
const titleSwapBtn = document.getElementById('titleSwapBtn');
const mainTitle = document.getElementById('mainTitle');

titleSwapBtn.addEventListener('click', () => {
    // Check if the title is currently showing the Morse string tokens
    if (mainTitle.innerHTML === '-- --- .-. ... . -.-. --- -.. . .-.') {
        mainTitle.innerHTML = 'MORSECODER';
    } else {
        mainTitle.innerHTML = '-- --- .-. ... . -.-. --- -.. . .-.';
    }
});