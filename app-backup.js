// GrandPal AI - Main Application Logic

// State Management
const appState = {
    dailyUses: parseInt(localStorage.getItem('dailyUses') || '5'),
    lastResetDate: localStorage.getItem('lastResetDate') || new Date().toDateString(),
    totalUses: parseInt(localStorage.getItem('totalUses') || '0'),
    isPremium: localStorage.getItem('isPremium') === 'true',
    geminiApiKey: localStorage.getItem('geminiApiKey') || ''
};

// Constants
const FREE_DAILY_LIMIT = 5;
const AD_BONUS_USES = 10;
const AD_DURATION = 30; // seconds

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkDailyReset();
    updateUsageDisplay();
    initializeEventListeners();
    
    // Check if user needs to set up Gemini API key
    if (!appState.geminiApiKey && !appState.isPremium) {
        showApiKeySetup();
    }
});

// Check and reset daily usage
function checkDailyReset() {
    const today = new Date().toDateString();
    if (appState.lastResetDate !== today) {
        appState.dailyUses = FREE_DAILY_LIMIT;
        appState.lastResetDate = today;
        localStorage.setItem('dailyUses', appState.dailyUses);
        localStorage.setItem('lastResetDate', today);
    }
}

// Update usage display
function updateUsageDisplay() {
    document.getElementById('daily-uses').textContent = appState.dailyUses;
}

// Initialize all event listeners
function initializeEventListeners() {
    // Translation
    document.getElementById('translate-btn').addEventListener('click', handleTranslation);
    document.getElementById('new-translation').addEventListener('click', resetTranslation);
    
    // Voice input
    document.getElementById('voice-input').addEventListener('click', handleVoiceInput);
    
    // Paste button
    document.getElementById('paste-btn').addEventListener('click', handlePaste);
    
    // Popular terms
    document.querySelectorAll('.term-card').forEach(card => {
        card.addEventListener('click', () => {
            const term = card.getAttribute('data-term').toLowerCase();
            document.getElementById('user-input').value = term;
            handleTranslation();
        });
    });
    
    // Premium button
    document.querySelector('.premium-btn').addEventListener('click', showPremiumModal);
    
    // Modal controls
    document.getElementById('watch-ad-btn').addEventListener('click', watchAd);
    document.getElementById('skip-ad-btn').addEventListener('click', () => hideModal('ad-modal'));
    document.getElementById('watch-ad-option').addEventListener('click', () => {
        hideModal('limit-modal');
        showModal('ad-modal');
    });
    document.getElementById('premium-option').addEventListener('click', () => {
        hideModal('limit-modal');
        showPremiumModal();
    });
    
    // Close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    // Premium subscribe
    document.querySelector('.subscribe-btn').addEventListener('click', handleSubscribe);
}

// Main translation handler
async function handleTranslation() {
    console.log('handleTranslation called');
    const input = document.getElementById('user-input').value.trim();
    console.log('Input:', input);
    
    if (!input) {
        alert('Please enter some text to translate!');
        return;
    }
    
    // Check usage limit
    if (!appState.isPremium && appState.dailyUses <= 0) {
        console.log('Usage limit reached');
        showModal('limit-modal');
        return;
    }
    
    // First check local database
    console.log('Checking local database...');
    let localTranslation = null;
    
    // Check if translateTerm function exists
    if (typeof translateTerm !== 'undefined') {
        localTranslation = translateTerm(input);
        console.log('Local translation result:', localTranslation);
    } else {
        console.log('translateTerm function not found, skipping local database');
    }
    
    if (localTranslation) {
        displayTranslation(localTranslation);
    } else {
        // Use Gemini API for complex translations
        console.log('Using Gemini API...');
        await translateWithGemini(input);
    }
    
    // Update usage only after successful translation
    // Moved to after displayTranslation or displayAITranslation
}

// Display translation results
function displayTranslation(data) {
    document.getElementById('translation-result').innerHTML = `
        <p><strong>Translation:</strong> ${data.meaning}</p>
    `;
    
    document.getElementById('context-info').textContent = data.context;
    document.getElementById('response-suggestion').textContent = data.response;
    
    document.getElementById('result-area').classList.remove('hidden');
    document.getElementById('user-input').disabled = true;
    document.getElementById('translate-btn').disabled = true;
    
    // Update usage after successful translation
    if (!appState.isPremium) {
        appState.dailyUses--;
        appState.totalUses++;
        localStorage.setItem('dailyUses', appState.dailyUses);
        localStorage.setItem('totalUses', appState.totalUses);
        updateUsageDisplay();
    }
}

// Translate with Gemini API
async function translateWithGemini(input) {
    console.log('translateWithGemini called with:', input);
    console.log('API Key exists:', !!appState.geminiApiKey);
    
    if (!appState.geminiApiKey) {
        console.log('No API key, showing setup...');
        showApiKeySetup();
        return;
    }
    
    // Show loading state
    document.getElementById('translate-btn').textContent = 'Translating...';
    document.getElementById('translate-btn').disabled = true;
    
    try {
        const prompt = `You are helping a grandparent understand modern slang and internet culture. 
        Please explain this text in simple, friendly terms: "${input}"
        
        Provide:
        1. A clear translation/meaning
        2. Context about when/how it's used
        3. A suggestion for how they might respond
        
        Keep explanations simple and avoid using other slang terms.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appState.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Parse AI response and display
        displayAITranslation(aiResponse);
        
    } catch (error) {
        console.error('Translation error:', error);
        console.error('Full error details:', error.stack);
        alert('Sorry, I had trouble translating that. Please try again.');
    } finally {
        document.getElementById('translate-btn').textContent = 'Explain This To Me';
        document.getElementById('translate-btn').disabled = false;
    }
}

// Display AI translation
function displayAITranslation(aiResponse) {
    // Parse the AI response to extract the three parts
    const sections = aiResponse.split(/\d+\.\s+/).filter(s => s.trim());
    
    let meaning = 'Translation provided by AI';
    let context = 'Common usage in modern communication';
    let response = 'Feel free to ask for clarification!';
    
    // Try to extract each section
    if (sections.length >= 1) {
        // First section after the intro text
        const fullText = aiResponse;
        
        // Extract meaning (after "1." and before "2.")
        const meaningMatch = fullText.match(/1\.\s*([^2]+)(?=2\.|$)/s);
        if (meaningMatch) meaning = meaningMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ');
        
        // Extract context (after "2." and before "3.")
        const contextMatch = fullText.match(/2\.\s*([^3]+)(?=3\.|$)/s);
        if (contextMatch) context = contextMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ');
        
        // Extract response suggestion (after "3.")
        const responseMatch = fullText.match(/3\.\s*(.+)$/s);
        if (responseMatch) response = responseMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ');
    }
    
    document.getElementById('translation-result').innerHTML = `
        <p><strong>What it means:</strong> ${meaning}</p>
    `;
    
    document.getElementById('context-info').textContent = context;
    document.getElementById('response-suggestion').textContent = response;
    
    document.getElementById('result-area').classList.remove('hidden');
    document.getElementById('user-input').disabled = true;
    document.getElementById('translate-btn').disabled = true;
    
    // Update usage after successful translation
    if (!appState.isPremium) {
        appState.dailyUses--;
        appState.totalUses++;
        localStorage.setItem('dailyUses', appState.dailyUses);
        localStorage.setItem('totalUses', appState.totalUses);
        updateUsageDisplay();
    }
}

// Reset translation interface
function resetTranslation() {
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('user-input').value = '';
    document.getElementById('user-input').disabled = false;
    document.getElementById('translate-btn').disabled = false;
}

// Voice input handler
function handleVoiceInput() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Voice input is not supported in your browser. Please try Chrome or Edge.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        document.getElementById('voice-input').textContent = '🔴 Listening...';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        alert('Sorry, I couldn\'t hear you clearly. Please try again.');
    };
    
    recognition.onend = () => {
        document.getElementById('voice-input').textContent = '🎤 Speak';
    };
    
    recognition.start();
}

// Paste handler
async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('user-input').value = text;
    } catch (err) {
        alert('Unable to paste. Please make sure you have copied some text first.');
    }
}

// Watch ad function
function watchAd() {
    const adContainer = document.querySelector('.ad-container');
    const timerElement = document.querySelector('.ad-timer');
    const watchBtn = document.getElementById('watch-ad-btn');
    
    watchBtn.disabled = true;
    watchBtn.textContent = 'Ad Playing...';
    
    let timeLeft = AD_DURATION;
    
    const timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `${timeLeft} seconds`;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            
            // Add bonus uses
            appState.dailyUses += AD_BONUS_USES;
            localStorage.setItem('dailyUses', appState.dailyUses);
            updateUsageDisplay();
            
            // Reset and close
            watchBtn.disabled = false;
            watchBtn.textContent = 'Watch Ad';
            timerElement.textContent = '30 seconds';
            hideModal('ad-modal');
            
            alert(`Great! You've earned ${AD_BONUS_USES} more translations for today!`);
        }
    }, 1000);
}

// Premium subscription handler
function handleSubscribe() {
    alert('Premium subscription would be handled here. For this demo, premium features are simulated.');
    appState.isPremium = true;
    localStorage.setItem('isPremium', 'true');
    hideModal('premium-modal');
    location.reload();
}

// API Key setup
function showApiKeySetup() {
    const key = prompt('To use GrandPal AI, please enter your Gemini API key. Get one free at: https://makersuite.google.com/app/apikey');
    if (key) {
        appState.geminiApiKey = key;
        localStorage.setItem('geminiApiKey', key);
    }
}

// Modal helpers
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Premium modal
function showPremiumModal() {
    showModal('premium-modal');
}