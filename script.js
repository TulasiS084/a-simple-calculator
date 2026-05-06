const parser = new MathParser();

// State
let expression = '';
let memory = 0;
let is2ndActive = false;
let history = JSON.parse(localStorage.getItem('calc_history')) || [];
let newCalculation = false;

// DOM Elements
const displayExpr = document.getElementById('expression');
const displayRes = document.getElementById('result');
const historyList = document.getElementById('history-list');
const audio = document.getElementById('btn-sound');

// Initialize
init();

function init() {
    renderHistory();
    setupEventListeners();
    
    // Load theme
    const theme = localStorage.getItem('calc_theme');
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.querySelector('#theme-toggle i').className = 'fas fa-moon';
    }
}

function playSound() {
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

function updateDisplay() {
    displayExpr.textContent = expression;
    // Scroll expression to the right
    const exprContainer = document.querySelector('.expression-container');
    exprContainer.scrollLeft = exprContainer.scrollWidth;
}

function formatResult(res) {
    if (res === "Error" || res === "NaN" || res === "Infinity" || res === "-Infinity") return res;
    let num = parseFloat(res);
    
    // If integer, return as is
    if (Number.isInteger(num)) {
        if (num.toString().length > 12) {
            return num.toExponential(6);
        }
        return num.toString();
    }
    
    // Check if it's too long
    let str = num.toString();
    if (str.length > 12) {
        if (Math.abs(num) > 1e10 || Math.abs(num) < 1e-6) {
            return num.toExponential(6);
        }
        return parseFloat(num.toFixed(8)).toString(); // Remove trailing zeros
    }
    return str;
}

function appendValue(val) {
    if (newCalculation) {
        if (['+', '-', '*', '/', '%', '^'].includes(val) || val === 'x^2') {
            // Continue with previous result
            expression = displayRes.textContent === 'Error' ? '0' : displayRes.textContent;
        } else {
            expression = '';
            displayRes.textContent = '0';
        }
        newCalculation = false;
    }

    // Handle functions that need a parenthesis
    const funcWithParen = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'cbrt', 'exp', 'abs'];
    
    if (funcWithParen.includes(val)) {
        expression += val + '(';
    } else if (val === '10^') {
        expression += '10^(';
    } else if (val === '2^') {
        expression += '2^(';
    } else if (val === '1/x') {
        expression += '1/(';
    } else if (val === 'x^2') {
        expression += '^2';
    } else {
        expression += val;
    }

    updateDisplay();
}

function calculate() {
    if (!expression) return;
    
    // Auto-close open parentheses
    let openParenCount = (expression.match(/\(/g) || []).length;
    let closeParenCount = (expression.match(/\)/g) || []).length;
    for (let i = 0; i < openParenCount - closeParenCount; i++) {
        expression += ')';
    }
    updateDisplay();

    const result = parser.evaluate(expression);
    const formattedResult = formatResult(result);
    displayRes.textContent = formattedResult;
    
    if (formattedResult !== "Error" && formattedResult !== "NaN" && formattedResult !== "Infinity") {
        addToHistory(expression, formattedResult);
    }
    
    newCalculation = true;
}

function toggle2nd() {
    is2ndActive = !is2ndActive;
    document.getElementById('btn-2nd').classList.toggle('active-2nd');
    
    const toggleables = document.querySelectorAll('.toggleable');
    toggleables.forEach(btn => {
        const currentVal = btn.dataset.val;
        const currentAlt = btn.dataset.alt;
        btn.dataset.val = currentAlt;
        btn.dataset.alt = currentVal;
        
        // Update Text
        const textMap = {
            'sin': 'sin', 'asin': 'sin⁻¹',
            'cos': 'cos', 'acos': 'cos⁻¹',
            'tan': 'tan', 'atan': 'tan⁻¹',
            'sqrt': '√x', 'cbrt': '∛x',
            '10^': '10ˣ', '2^': '2ˣ'
        };
        btn.innerHTML = textMap[btn.dataset.val] || btn.dataset.val;
    });
}

function addToHistory(expr, res) {
    history.unshift({ expr, res });
    if (history.length > 50) history.pop();
    localStorage.setItem('calc_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-expr">${item.expr} =</div>
            <div class="history-res">${item.res}</div>
        `;
        li.addEventListener('click', () => {
            expression = item.expr;
            displayRes.textContent = item.res;
            newCalculation = true;
            updateDisplay();
            
            // Close panel on mobile after selection
            if (window.innerWidth <= 900) {
                document.getElementById('history-panel').classList.remove('show');
            }
        });
        historyList.appendChild(li);
    });
}

function setupEventListeners() {
    // Buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            playSound();
            
            // Visual click effect
            btn.classList.remove('animate-click');
            void btn.offsetWidth; // trigger reflow
            btn.classList.add('animate-click');

            if (btn.dataset.val) {
                appendValue(btn.dataset.val);
            } else if (btn.dataset.action) {
                handleAction(btn.dataset.action);
            }
        });
    });

    // Memory Buttons
    document.querySelectorAll('.mem-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound();
            const action = btn.dataset.action;
            const currentRes = parseFloat(displayRes.textContent) || 0;
            
            switch(action) {
                case 'mc': memory = 0; break;
                case 'mr': 
                    if (newCalculation) { expression = ''; newCalculation = false; }
                    expression += memory.toString(); 
                    updateDisplay();
                    break;
                case 'm+': memory += currentRes; newCalculation = true; break;
                case 'm-': memory -= currentRes; newCalculation = true; break;
                case 'ms': memory = currentRes; newCalculation = true; break;
            }
        });
    });

    // Header Toggles
    document.getElementById('deg-btn').addEventListener('click', (e) => {
        parser.setDegreeMode(true);
        e.target.classList.add('active');
        document.getElementById('rad-btn').classList.remove('active');
    });

    document.getElementById('rad-btn').addEventListener('click', (e) => {
        parser.setDegreeMode(false);
        e.target.classList.add('active');
        document.getElementById('deg-btn').classList.remove('active');
    });

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('calc_theme', isDark ? 'dark' : 'light');
    });

    const historyPanel = document.getElementById('history-panel');
    document.getElementById('history-toggle').addEventListener('click', () => {
        historyPanel.classList.toggle('show');
    });
    
    document.getElementById('close-history').addEventListener('click', () => {
        historyPanel.classList.remove('show');
    });

    document.getElementById('clear-history').addEventListener('click', () => {
        history = [];
        localStorage.removeItem('calc_history');
        renderHistory();
    });

    // Keyboard support
    document.addEventListener('keydown', handleKeyboard);
}

function handleAction(action) {
    switch (action) {
        case 'clear':
            expression = '';
            displayRes.textContent = '0';
            updateDisplay();
            break;
        case 'backspace':
            if (newCalculation) {
                expression = '';
                displayRes.textContent = '0';
                newCalculation = false;
            } else {
                expression = expression.slice(0, -1);
            }
            updateDisplay();
            break;
        case 'equals':
            calculate();
            break;
        case '2nd':
            toggle2nd();
            break;
        case 'copy':
            navigator.clipboard.writeText(displayRes.textContent)
                .then(() => {
                    const copyIcon = document.querySelector('.copy-btn i');
                    copyIcon.className = 'fas fa-check';
                    setTimeout(() => copyIcon.className = 'far fa-copy', 1500);
                });
            break;
    }
}

function handleKeyboard(e) {
    const key = e.key;
    
    // Prevent default actions for some keys to avoid page scrolling/refreshing
    if (['Enter', 'Backspace', ' '].includes(key)) {
        // Only prevent if focus is not on input/button to allow normal navigation
        if (document.activeElement.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    }

    if (/[0-9.]/.test(key)) {
        playSound();
        appendValue(key);
    } else if (['+', '-', '*', '/', '%', '^', '(', ')'].includes(key)) {
        playSound();
        appendValue(key);
    } else if (key === 'Enter' || key === '=') {
        playSound();
        handleAction('equals');
    } else if (key === 'Backspace') {
        playSound();
        handleAction('backspace');
    } else if (key === 'Escape') {
        playSound();
        handleAction('clear');
    } else if (key === 'p') {
        playSound();
        appendValue('pi');
    } else if (key === 'e') {
        playSound();
        appendValue('e');
    } else if (key === '!') {
        playSound();
        appendValue('!');
    }
}
