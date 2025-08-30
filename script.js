// --- GŁÓWNE ELEMENTY I STAN ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
    body: document.body, textInput: $('#text-input'), mixingModeSelect: $('#mixing-mode-select'),
    mixingOptionsBox: $('#mixing-options-box'), 
    sizeSlider: $('#size-slider'), sizeInput: $('#size-input'),
    spaceWidthSlider: $('#space-width-slider'), spaceWidthInput: $('#space-width-input'),
    letterSpacingSlider: $('#letter-spacing-slider'), letterSpacingInput: $('#letter-spacing-input'),
    orientationSelect: $('#orientation-select'),
    canvas: $('#canvas'), downloadLink: $('#download-link'), copyBtn: $('#copy-btn'),
    themeToggle: $('#theme-toggle'), langSwitcher: $('.language-switcher'), selectAllBtns: $$('.btn-select-all'),
    zoomSlider: $('#zoom-slider'), bgTypeSelect: $('#bg-type-select'), bgColorControls: $('#bg-color-controls'),
    bgColorPicker: $('#bg-color-picker'), outlineToggle: $('#outline-toggle'), outlineColorPicker: $('#outline-color-picker'),
    shadowToggle: $('#shadow-toggle'), shadowColorPicker: $('#shadow-color-picker'),
    resetBtn: $('#reset-btn'),
    errorBox: $('#error-box'),
};

const ctx = elements.canvas.getContext('2d');

const defaultSettings = {
    text: 'PIXELS',
    pixelScale: 5,
    spaceWidth: 2,
    letterSpacing: 1,
    orientation: 'horizontal',
    mixingMode: 'per-letter',
    background: 'transparent',
    outline: false,
    shadow: false,
    zoom: 1
};

const state = {
    selectedColors: new Set(),
    usesPaidColors: false,
    lang: 'pl',
    defaultChar: '?',
    outlineColor: 'rgb(255,255,255)',
    shadowColor: 'rgb(0,0,0)',
    backgroundColor: 'rgb(68,68,68)',
    colorSelectionMode: 'text',
    appData: {
        font: null, palettes: null, translations: null,
    },
};

// --- Ładowanie danych z plików JSON ---
async function loadAppData() {
    try {
        const [fontResponse, palettesResponse, translationsResponse] = await Promise.all([
            fetch('./font-data.json'),
            fetch('./palettes.json'),
            fetch('./translations.json')
        ]);
        state.appData.font = await fontResponse.json();
        state.appData.palettes = await palettesResponse.json();
        state.appData.translations = await translationsResponse.json();
    } catch (error) {
        console.error("Failed to load application data:", error);
        // ZMIANA: Lepsza obsługa błędów
        elements.errorBox.textContent = "Nie udało się załadować kluczowych danych aplikacji. Odśwież stronę, aby spróbować ponownie.";
        elements.errorBox.classList.remove('hidden');
    }
}

// --- INICJALIZACJA APLIKACJI ---
async function initialize() {
    await loadAppData();
    if (!state.appData.font) return; 

    initTheme();
    initLang();
    populatePalettes();
    addEventListeners();
    
    state.selectedColors.add("rgb(224,159,249)");
    state.selectedColors.add("rgb(243,141,169)");

    resetSettings(); 
}

function resetSettings() {
    elements.textInput.value = defaultSettings.text;
    elements.sizeSlider.value = defaultSettings.pixelScale;
    elements.spaceWidthSlider.value = defaultSettings.spaceWidth;
    elements.letterSpacingSlider.value = defaultSettings.letterSpacing;
    elements.orientationSelect.value = defaultSettings.orientation;
    elements.mixingModeSelect.value = defaultSettings.mixingMode;
    elements.bgTypeSelect.value = defaultSettings.background;
    elements.outlineToggle.checked = defaultSettings.outline;
    elements.shadowToggle.checked = defaultSettings.shadow;
    elements.zoomSlider.value = defaultSettings.zoom;
    elements.canvas.style.transform = `scale(${defaultSettings.zoom})`;
    
    render();
}

// --- LOGIKA UI ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
}

function setTheme(theme) {
    elements.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
}

function initLang() {
    state.lang = localStorage.getItem('language') || 'pl';
    setLanguage(state.lang);
}

function setLanguage(lang) {
    state.lang = lang;
    localStorage.setItem('language', lang);
    $$('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const translation = state.appData.translations[lang]?.[key];
        if (translation) {
            el.textContent = translation;
        }
    });
    elements.langSwitcher.querySelector('.active')?.classList.remove('active');
    elements.langSwitcher.querySelector(`[data-lang="${lang}"]`)?.classList.add('active');
    updateUI();
}

function populatePalettes() {
    Object.entries(state.appData.palettes).forEach(([paletteId, colors]) => {
        const container = $(`#${paletteId}`);
        if (!container) return;
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        colors.forEach(color => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-btn';
            btn.dataset.color = color.rgb;
            btn.dataset.type = paletteId.includes('paid') ? 'paid' : 'free';
            btn.style.background = color.rgb;
            btn.title = color.name;
            fragment.appendChild(btn);
        });
        container.appendChild(fragment);
    });
}

function updateUI() {
    elements.mixingOptionsBox.classList.toggle('hidden', state.selectedColors.size < 2);
    elements.sizeInput.value = elements.sizeSlider.value;
    elements.spaceWidthInput.value = elements.spaceWidthSlider.value;
    elements.letterSpacingInput.value = elements.letterSpacingSlider.value;
    
    state.usesPaidColors = false;
    $$('.color-btn').forEach(btn => {
        const isSelected = state.selectedColors.has(btn.dataset.color);
        btn.classList.toggle('selected', isSelected);
        if (isSelected && btn.dataset.type === 'paid') {
            state.usesPaidColors = true;
        }
    });

    elements.selectAllBtns.forEach(btn => {
        const paletteId = btn.dataset.palette;
        const allColors = state.appData.palettes[paletteId]?.map(c => c.rgb) || [];
        const allSelected = allColors.length > 0 && allColors.every(c => state.selectedColors.has(c));
        btn.dataset.action = allSelected ? 'unselect' : 'select';
        const transKey = allSelected ? 'unselectAll' : 'selectAll';
        btn.textContent = state.appData.translations[state.lang][transKey];
    });

    elements.bgColorControls.classList.toggle('hidden', elements.bgTypeSelect.value === 'transparent');
    elements.bgColorPicker.style.backgroundColor = state.backgroundColor;
    elements.outlineColorPicker.style.backgroundColor = state.outlineColor;
    elements.shadowColorPicker.style.backgroundColor = state.shadowColor;
    
    elements.bgColorPicker.classList.toggle('selecting', state.colorSelectionMode === 'background');
    elements.outlineColorPicker.classList.toggle('selecting', state.colorSelectionMode === 'outline');
    elements.shadowColorPicker.classList.toggle('selecting', state.colorSelectionMode === 'shadow');
    elements.body.classList.toggle('color-picking-mode', state.colorSelectionMode !== 'text');
}

// --- LOGIKA ZDARZEŃ ---

// ZMIANA: Funkcja Debounce dla optymalizacji
function debounce(func, delay = 200) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function addEventListeners() {
    const debouncedRender = debounce(render);

    // Zdarzenia, które powinny wywołać renderowanie natychmiast
    const immediateRenderControls = [
        elements.textInput, elements.mixingModeSelect, elements.orientationSelect,
        elements.bgTypeSelect, elements.outlineToggle, elements.shadowToggle
    ];
    immediateRenderControls.forEach(el => el.addEventListener('input', render));

    // Synchronizacja suwaków i pól numerycznych z opóźnionym renderowaniem (FIX na płynne pisanie)
    const syncSliderAndInput = (slider, input) => {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            debouncedRender();
        });
        input.addEventListener('input', () => {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            let value = parseFloat(input.value);
            
            if (isNaN(value)) return;

            if (value > max) value = max;
            if (value < min) value = min;
            
            slider.value = value;
            // Nie aktualizujemy input.value tutaj, aby nie blokować pisania
            debouncedRender();
        });
        // Upewnij się, że po wyjściu z pola wartość jest poprawna
        input.addEventListener('change', () => {
            if (input.value !== slider.value) {
                 input.value = slider.value;
            }
        });
    };

    syncSliderAndInput(elements.sizeSlider, elements.sizeInput);
    syncSliderAndInput(elements.spaceWidthSlider, elements.spaceWidthInput);
    syncSliderAndInput(elements.letterSpacingSlider, elements.letterSpacingInput);
    
    // Pozostałe zdarzenia
    elements.themeToggle.addEventListener('click', () => setTheme(elements.body.classList.contains('dark-theme') ? 'light' : 'dark'));
    elements.langSwitcher.addEventListener('click', (e) => e.target.dataset.lang && setLanguage(e.target.dataset.lang));
    $$('.color-palette').forEach(p => p.addEventListener('click', handleColorClick));
    elements.selectAllBtns.forEach(b => b.addEventListener('click', handleSelectAll));
    elements.zoomSlider.addEventListener('input', () => {
        elements.canvas.style.transform = `scale(${elements.zoomSlider.value})`;
    });
    elements.bgColorPicker.addEventListener('click', () => setPickerMode('background'));
    elements.outlineColorPicker.addEventListener('click', () => setPickerMode('outline'));
    elements.shadowColorPicker.addEventListener('click', () => setPickerMode('shadow'));
    
    elements.copyBtn.addEventListener('click', handleCopyImage);
    elements.resetBtn.addEventListener('click', resetSettings);
}

async function handleCopyImage() {
    if (elements.copyBtn.disabled) return;
    try {
        const blob = await new Promise(resolve => elements.canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        const originalText = elements.copyBtn.textContent;
        const successText = state.appData.translations[state.lang]['copiedSuccess'];
        elements.copyBtn.textContent = successText;
        elements.copyBtn.disabled = true;

        setTimeout(() => {
            elements.copyBtn.textContent = originalText;
            elements.copyBtn.disabled = false;
        }, 2000);

    } catch (err) {
        console.error('Failed to copy image: ', err);
        alert(state.lang === 'pl' ? 'Nie udało się skopiować obrazka.' : 'Failed to copy image.');
    }
}

function setPickerMode(mode) {
    state.colorSelectionMode = state.colorSelectionMode === mode ? 'text' : mode;
    updateUI();
}

const handleColorClick = (e) => {
    const btn = e.target.closest('.color-btn');
    if (!btn) return;
    const color = btn.dataset.color;

    if (state.colorSelectionMode === 'text') {
        state.selectedColors.has(color) ? state.selectedColors.delete(color) : state.selectedColors.add(color);
    } else {
        state[state.colorSelectionMode + 'Color'] = color;
        state.colorSelectionMode = 'text';
    }
    render();
};

const handleSelectAll = (e) => {
    const paletteId = e.target.dataset.palette;
    const colors = state.appData.palettes[paletteId]?.map(c => c.rgb) || [];
    const shouldSelect = e.target.dataset.action === 'select';
    colors.forEach(c => shouldSelect ? state.selectedColors.add(c) : state.selectedColors.delete(c));
    render();
};

// --- SILNIK RENDERUJĄCY ---
function parseTextToTokens(text, customSymbols) {
    const tokens = [];
    let tempText = text;
    const symbolKeys = Object.keys(customSymbols).sort((a, b) => b.length - a.length);

    while (tempText.length > 0) {
        let found = false;
        for (const key of symbolKeys) {
            if (tempText.startsWith(key)) {
                tokens.push(key);
                tempText = tempText.substring(key.length);
                found = true;
                break;
            }
        }
        if (!found) {
            tokens.push(tempText[0]);
            tempText = tempText.substring(1);
        }
    }
    return tokens;
}

function createTextBitmap(charDataArray, options) {
    const { orientation, spaceWidth, letterSpacing, charHeight } = options;
    const bitmap = [];
    let cursorX = 0;
    
    if (orientation === 'horizontal') {
        for (let i = 0; i < charHeight; i++) bitmap.push([]);
        
        charDataArray.forEach(charData => {
            const charWidth = charData.isSpace ? spaceWidth : (charData.data[0]?.length || 0);
            for (let y = 0; y < charHeight; y++) {
                for (let x = 0; x < charWidth; x++) {
                    const pixel = charData.isSpace ? 0 : (charData.data[y]?.[x] || 0);
                    bitmap[y][cursorX + x] = pixel;
                }
                if (!charData.isSpace) {
                    for (let s = 0; s < letterSpacing; s++) {
                        bitmap[y][cursorX + charWidth + s] = 0;
                    }
                }
            }
            cursorX += charWidth + (charData.isSpace ? 0 : letterSpacing);
        });
    }
    return bitmap;
}

function render() {
    if (!state.appData.font) return;
    updateUI();

    const text = elements.textInput.value || '';
    const scale = parseInt(elements.sizeSlider.value, 10);
    const spaceWidth = parseInt(elements.spaceWidthSlider.value, 10);
    const letterSpacing = parseInt(elements.letterSpacingSlider.value, 10);
    const colors = state.selectedColors.size > 0 ? Array.from(state.selectedColors) : ['#FFFFFF'];
    const orientation = elements.orientationSelect.value;
    const mixingMode = elements.mixingModeSelect.value;
    const charHeight = 7;

    const { pixelMap, customSymbols } = state.appData.font;
    const textTokens = parseTextToTokens(text, customSymbols);
    const charDataArray = textTokens.map(token => ({
        isSpace: token === ' ',
        data: customSymbols[token] || pixelMap[token] || pixelMap[state.defaultChar]
    }));

    let canvasWidth, canvasHeight;
    if (orientation === 'horizontal') {
        const totalWidthInPixels = charDataArray.reduce((w, data, i) => {
            const width = data.isSpace ? spaceWidth : (data.data[0]?.length || 0);
            const isLastChar = i === charDataArray.length - 1;
            const spacing = (isLastChar || data.isSpace) ? 0 : letterSpacing;
            return w + width + spacing;
        }, 0);
        canvasWidth = totalWidthInPixels * scale;
        canvasHeight = charHeight * scale;
    } else {
        const maxWidthInPixels = Math.max(1, ...charDataArray.map(data => data.isSpace ? spaceWidth : (data.data[0]?.length || 0)));
        canvasWidth = maxWidthInPixels * scale;
        const totalHeightInPixels = charDataArray.length * charHeight + (charDataArray.length - 1) * letterSpacing;
        canvasHeight = totalHeightInPixels * scale;
    }

    elements.canvas.width = Math.max(1, canvasWidth);
    elements.canvas.height = Math.max(1, canvasHeight);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    if (elements.bgTypeSelect.value === 'solid') {
        ctx.fillStyle = state.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    if (elements.shadowToggle.checked) {
        ctx.shadowColor = state.shadowColor;
        ctx.shadowOffsetX = scale;
        ctx.shadowOffsetY = scale;
        ctx.shadowBlur = 0;
    }

    if (elements.outlineToggle.checked) {
        const bitmap = createTextBitmap(charDataArray, { orientation, spaceWidth, letterSpacing, charHeight });
        ctx.fillStyle = state.outlineColor;
        const bitmapHeight = bitmap.length;
        if(bitmapHeight > 0) {
            const bitmapWidth = bitmap[0].length;
            for (let y = 0; y < bitmapHeight; y++) {
                for (let x = 0; x < bitmapWidth; x++) {
                    if (bitmap[y]?.[x] === 1) continue; 
                    
                    const hasNeighbor = (bitmap[y-1]?.[x] === 1) || (bitmap[y+1]?.[x] === 1) ||
                                          (bitmap[y]?.[x-1] === 1) || (bitmap[y]?.[x+1] === 1);

                    if (hasNeighbor) {
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
        }
    }
    
    drawTextPass(charDataArray, {
        scale, spaceWidth, colors, orientation, mixingMode, charHeight,
        letterSpacing, textTokens,
    });
    
    ctx.shadowColor = 'transparent';

    elements.downloadLink.href = elements.canvas.toDataURL('image/png');
    elements.downloadLink.download = `${text.replace(/[^a-z0-9]/gi, '_') || 'pixel-art'}.png`;
}

function drawTextPass(charDataArray, options) {
    const { scale, spaceWidth, colors, orientation, mixingMode, charHeight, letterSpacing, textTokens } = options;
    let cursorX = 0, cursorY = 0;
    let wordIndex = 0;

    charDataArray.forEach((charObj, i) => {
        const charData = charObj.data;
        const charWidth = charData[0]?.length || 0;
        
        if (charObj.isSpace) {
            if (orientation === 'horizontal') {
                cursorX += spaceWidth * scale;
            } else {
                cursorY += (charHeight + letterSpacing) * scale;
            }
            return;
        }
        
        let currentColor = colors[0];
        switch (mixingMode) {
            case 'per-letter': currentColor = colors[i % colors.length]; break;
            case 'per-word':
                if (i > 0 && textTokens[i-1] === ' ') wordIndex++;
                currentColor = colors[wordIndex % colors.length]; break;
            case 'random-letter': currentColor = colors[Math.floor(Math.random() * colors.length)]; break;
        }
        ctx.fillStyle = currentColor;

        for (let y = 0; y < charData.length; y++) {
            for (let x = 0; x < charData[y].length; x++) {
                if (charData[y][x] === 1) {
                    if (mixingMode === 'checkerboard') {
                        const globalX = Math.floor(cursorX / scale) + x;
                        const globalY = Math.floor(cursorY / scale) + y;
                        ctx.fillStyle = (globalX + globalY) % 2 === 0 ? colors[0] : colors[1 % colors.length];
                    }
                    ctx.fillRect(cursorX + (x * scale), cursorY + (y * scale), scale, scale);
                }
            }
        }
        
        if (orientation === 'horizontal') {
            cursorX += (charWidth + letterSpacing) * scale;
        } else {
            cursorY += (charHeight + letterSpacing) * scale;
        }
    });
}

document.addEventListener('DOMContentLoaded', initialize);