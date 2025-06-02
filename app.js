// GrandPal AI - Enhanced Version with Animations and Toast

// Toast System
const toastManager = {
    container: null,
    
    init() {
        this.container = document.getElementById('toast-container');
    },
    
    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close">×</button>
        `;
        
        this.container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        });
    }
};

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Enhanced State Management
const appState = {
    dailyUses: parseInt(localStorage.getItem('dailyUses') || '3'),
    lastResetDate: localStorage.getItem('lastResetDate') || new Date().toDateString(),
    totalUses: parseInt(localStorage.getItem('totalUses') || '0'),
    isPremium: localStorage.getItem('isPremium') === 'true',
    isTranslating: false,
    translationCount: parseInt(localStorage.getItem('translationCount') || '0')
};

// Constants
const FREE_DAILY_LIMIT = 3; // Reduced for web app

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    try {
        toastManager.init();
        checkDailyReset();
        updateUsageDisplay();
        initializeEventListeners();
        addCharacterCounter();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error initializing app: ' + error.message);
    }
});

// Add character counter
function addCharacterCounter() {
    const textarea = document.getElementById('user-input');
    const wrapper = document.createElement('div');
    wrapper.className = 'textarea-wrapper';
    
    textarea.parentNode.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);
    
    const counter = document.createElement('span');
    counter.className = 'char-count';
    counter.textContent = '0/500';
    wrapper.appendChild(counter);
    
    textarea.addEventListener('input', (e) => {
        const length = e.target.value.length;
        counter.textContent = `${length}/500`;
        
        if (length > 500) {
            e.target.value = e.target.value.substring(0, 500);
            counter.textContent = '500/500';
            toastManager.show('Maximum character limit reached', 'warning');
        }
    });
}

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
    const translateBtn = document.getElementById('translate-btn');
    if (!translateBtn) {
        console.error('Translate button not found!');
        return;
    }
    
    translateBtn.addEventListener('click', handleTranslation);
    
    const newTranslationBtn = document.getElementById('new-translation');
    if (newTranslationBtn) {
        newTranslationBtn.addEventListener('click', resetTranslation);
    }
    
    // Voice input
    document.getElementById('voice-input').addEventListener('click', handleVoiceInput);
    
    // Paste button
    document.getElementById('paste-btn').addEventListener('click', handlePaste);
    
    // Popular terms
    document.querySelectorAll('.term-card').forEach(card => {
        card.addEventListener('click', () => {
            const term = card.getAttribute('data-term').toLowerCase();
            document.getElementById('user-input').value = term;
            document.querySelector('.char-count').textContent = `${term.length}/500`;
            handleTranslation();
        });
    });
    
    // Premium button
    document.querySelector('.premium-btn').addEventListener('click', showPremiumModal);
    
    // Modal controls
    const premiumOption = document.getElementById('premium-option');
    if (premiumOption) {
        premiumOption.addEventListener('click', () => {
            hideModal('limit-modal');
            showPremiumModal();
        });
    }
    
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
    if (appState.isTranslating) return;
    
    const input = document.getElementById('user-input').value.trim();
    
    if (!input) {
        toastManager.show('Please enter some text to translate!', 'warning');
        shakeElement(document.getElementById('user-input'));
        return;
    }
    
    // Check usage limit
    if (!appState.isPremium && appState.dailyUses <= 0) {
        showModal('limit-modal');
        return;
    }
    
    appState.isTranslating = true;
    showLoadingState();
    
    try {
        // Check if we should show interstitial ad
        appState.translationCount++;
        localStorage.setItem('translationCount', appState.translationCount);
        
        // Show ad every 3 translations for free users
        if (!appState.isPremium && appState.translationCount % 3 === 0) {
            await showInterstitialAd();
        }
        
        // Use Gemini API for all translations
        await translateWithGemini(input);
        
        // Update usage
        if (!appState.isPremium) {
            appState.dailyUses--;
            appState.totalUses++;
            localStorage.setItem('dailyUses', appState.dailyUses);
            localStorage.setItem('totalUses', appState.totalUses);
            updateUsageDisplay();
        }
    } catch (error) {
        console.error('Translation error:', error);
        toastManager.show('Sorry, something went wrong. Please try again.', 'error');
        hideLoadingState();
    } finally {
        appState.isTranslating = false;
    }
}

// Show loading state
function showLoadingState() {
    const btn = document.getElementById('translate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span style="animation: pulse 1s infinite">Translating...</span>';
    
    // Show skeleton loading
    const resultArea = document.getElementById('result-area');
    resultArea.classList.remove('hidden');
    resultArea.innerHTML = `
        <h3>Here's what it means:</h3>
        <div class="translation-box">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width: 80%"></div>
            <div class="skeleton skeleton-text" style="width: 60%"></div>
        </div>
    `;
}

// Hide loading state
function hideLoadingState() {
    const btn = document.getElementById('translate-btn');
    btn.disabled = false;
    btn.textContent = 'Explain This To Me';
}

// Removed displayTranslation function - now using only displayAITranslation

// Translate with Gemini API (via Vercel Function)
async function translateWithGemini(input) {
    try {
        const prompt = `You are helping a grandparent understand modern slang and internet culture. 
        Please explain this text in simple, friendly terms: "${input}"
        
        Format your response with markdown:
        
        # Translation
        [Clear meaning in simple terms]
        
        ## Context
        [When and how this is typically used]
        
        ## How to Respond
        [Suggested responses they could use]
        
        Keep explanations simple and avoid using other slang terms.`;
        
        // Use API route (relative URL for Vercel deployment)
        const apiUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api/translate'
            : '/api/translate';
        
        // If running from file:// protocol, show setup instructions
        if (window.location.protocol === 'file:') {
            const setupInstructions = `# Translation\nTo use GrandPal AI, you need to deploy it to a web server.\n\n## Context\nFor security reasons, API calls cannot be made from file:// URLs. You can:\n1. Deploy to Vercel (recommended)\n2. Run a local server with 'npx vercel dev'\n3. Use any web hosting service\n\n## How to Respond\nOnce deployed, you'll be able to translate any modern slang or internet culture!`;
            displayAITranslation(setupInstructions);
            toastManager.show('Please deploy to use real translations', 'warning');
            return;
        }
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.text;
        
        // Display AI translation with markdown
        displayAITranslation(aiResponse);
        toastManager.show('AI translation complete!', 'success');
        
    } catch (error) {
        console.error('Translation error:', error);
        toastManager.show('Failed to translate. Please try again later.', 'error');
        hideLoadingState();
    }
}

// Display AI translation with markdown
function displayAITranslation(aiResponse) {
    const resultArea = document.getElementById('result-area');
    resultArea.classList.remove('hidden');
    
    // Parse markdown to extract sections
    let translation = '';
    let context = '';
    let response = '';
    
    if (typeof marked !== 'undefined' && marked.parse) {
        // Parse the markdown and extract sections
        const sections = aiResponse.split(/\n##\s+/);
        const translationMatch = sections[0].match(/# Translation\s*\n([\s\S]*?)(?=\n##|$)/i);
        const contextMatch = aiResponse.match(/## Context\s*\n([\s\S]*?)(?=\n##|$)/i);
        const responseMatch = aiResponse.match(/## How to Respond\s*\n([\s\S]*?)$/i);
        
        if (translationMatch) translation = marked.parse(translationMatch[1].trim());
        if (contextMatch) context = marked.parse(contextMatch[1].trim());
        if (responseMatch) response = marked.parse(responseMatch[1].trim());
    } else {
        // Fallback for when marked.js is not available
        translation = '<p>Translation not available</p>';
        context = '<p>Context not available</p>';
        response = '<p>Response suggestions not available</p>';
    }
    
    resultArea.innerHTML = `
        <h3>Here's what it means:</h3>
        <div class="translation-box">
            <div class="translation-content">${translation}</div>
        </div>
        
        <div class="additional-info">
            <div class="context-box">
                <h4>📚 Context & Usage</h4>
                <div class="info-content">${context}</div>
            </div>
            
            <div class="example-box">
                <h4>💡 How to respond</h4>
                <div class="info-content">${response}</div>
            </div>
        </div>
    `;
    
    hideLoadingState();
    
    // Add success animation
    resultArea.querySelector('.translation-box').classList.add('success-animation');
}

// Reset translation interface
function resetTranslation() {
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('user-input').value = '';
    document.querySelector('.char-count').textContent = '0/500';
    document.getElementById('user-input').focus();
}

// Voice input handler
function handleVoiceInput() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        toastManager.show('Voice input is not supported in your browser', 'error');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    const voiceBtn = document.getElementById('voice-input');
    
    recognition.onstart = () => {
        voiceBtn.textContent = '🔴 Listening...';
        toastManager.show('Listening... Speak now!', 'info');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
        document.querySelector('.char-count').textContent = `${transcript.length}/500`;
        toastManager.show('Voice input captured!', 'success');
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toastManager.show('Sorry, I couldn\'t hear you clearly. Please try again.', 'error');
    };
    
    recognition.onend = () => {
        voiceBtn.textContent = '🎤 Speak';
    };
    
    recognition.start();
}

// Paste handler
async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('user-input').value = text;
        document.querySelector('.char-count').textContent = `${text.length}/500`;
        toastManager.show('Text pasted!', 'success');
    } catch (err) {
        toastManager.show('Unable to paste. Please check clipboard permissions.', 'error');
    }
}

// Watch ad function removed - using banner ads instead

// Premium subscription handler
function handleSubscribe() {
    toastManager.show('Premium subscription would be handled here. For this demo, premium features are simulated.', 'info');
    appState.isPremium = true;
    localStorage.setItem('isPremium', 'true');
    hideModal('premium-modal');
    setTimeout(() => location.reload(), 1500);
}

// Interstitial Ad function
async function showInterstitialAd() {
    return new Promise((resolve) => {
        const adModal = document.createElement('div');
        adModal.className = 'modal interstitial-ad';
        adModal.innerHTML = `
            <div class="modal-content ad-content">
                <div class="ad-header">
                    <span class="ad-label">Advertisement</span>
                    <span class="ad-timer" id="interstitial-timer">5</span>
                </div>
                <div class="interstitial-ad-space">
                    <div class="ad-placeholder">
                        <h3>Your Ad Here</h3>
                        <p>This is where a real ad would appear</p>
                        <div class="fake-ad-content">
                            <div class="fake-ad-image"></div>
                            <p class="fake-ad-text">Premium Experience - No Ads!</p>
                            <button class="fake-ad-button">Learn More</button>
                        </div>
                    </div>
                </div>
                <button id="skip-interstitial" class="skip-btn" disabled>
                    Skip Ad
                </button>
            </div>
        `;
        
        document.body.appendChild(adModal);
        
        let timeLeft = 5;
        const timer = setInterval(() => {
            timeLeft--;
            document.getElementById('interstitial-timer').textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                document.getElementById('skip-interstitial').disabled = false;
                document.getElementById('skip-interstitial').textContent = 'Continue';
            }
        }, 1000);
        
        // Handle skip/continue
        document.getElementById('skip-interstitial').addEventListener('click', () => {
            adModal.remove();
            resolve();
        });
        
        // Handle clicking on fake ad
        adModal.querySelector('.fake-ad-button').addEventListener('click', () => {
            showPremiumModal();
            adModal.remove();
            resolve();
        });
    });
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

// Utility functions
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shakeElement(element) {
    if (!element) {
        console.error('Element to shake not found');
        return;
    }
    element.classList.add('error-shake');
    setTimeout(() => element.classList.remove('error-shake'), 500);
}