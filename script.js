// Konfeti ve ses efektleri için yardımcı fonksiyonlar
function playWelcomeSounds() {
    // Web Audio API ile alkış ve party horn
    try {
        const ctx = window.AudioContext ? new window.AudioContext() : new window.webkitAudioContext();
        // Alkış efekti
        function playClap() {
            const dur = 0.18;
            for(let i=0;i<3;i++){
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = 800 + i*120;
                gain.gain.value = 0.22;
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime + i*0.04);
                osc.stop(ctx.currentTime + i*0.04 + dur);
            }
        }
        // Party horn efekti
        function playHorn() {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(880, ctx.currentTime+0.18);
            osc.frequency.linearRampToValueAtTime(220, ctx.currentTime+0.38);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime+0.45);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime+0.45);
        }
        playClap();
        setTimeout(playHorn, 600);
    } catch(e) { /* sessiz hata */ }
}

function launchConfetti() {
    // Basit konfeti animasyonu (canvas)
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const confetti = [];
    const colors = ['#ff2d55','#ffe066','#b2f7ef','#ffb6c1','#6c63ff','#ff8e53','#00c9a7'];
    for(let i=0;i<80;i++){
        confetti.push({
            x: Math.random()*canvas.width,
            y: -20-Math.random()*100,
            r: 8+Math.random()*12,
            d: Math.random()*Math.PI*2,
            color: colors[Math.floor(Math.random()*colors.length)],
            speed: 2+Math.random()*3
        });
    }
    let frame=0;
    function draw(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        for(const c of confetti){
            ctx.save();
            ctx.beginPath();
            ctx.arc(c.x,c.y,c.r,0,2*Math.PI);
            ctx.fillStyle=c.color;
            ctx.globalAlpha=0.85;
            ctx.fill();
            ctx.restore();
            c.y+=c.speed;
            c.x+=Math.sin(frame/12+c.d)*2;
            if(c.y>canvas.height+40){c.y=-20;c.x=Math.random()*canvas.width;}
        }
        frame++;
        if(frame<120){requestAnimationFrame(draw);}else{canvas.remove();}
    }
    draw();
}
console.log('script.js başarıyla yüklendi');
/**
 * MUN Badge Generator - Main Application Script
 * 
 * Features:
 * - CSV parsing with automatic header detection
 * - Master badge settings applied to all participants
 * - Per-participant override system
 * - Interactive drag-and-drop text editing on canvas
 * - Resize handles for text boxes
 * - Snap-to-grid alignment guides
 * - Custom font upload support
 * - ZIP download with optional back cover
 * - UTF-8 character support (Turkish, etc.)
 */

// ============================================
// Global State Management
// ============================================

const AppState = {
    // Uploaded files
    templateImage: null,
    backCoverImage: null,
    csvData: [],
    csvHeaders: [],
    customFonts: {},
    
    // Master settings (applied to all by default)
    masterSettings: {},
    
    // Per-participant overrides
    participantOverrides: {},
    
    // Current selection
    currentParticipantIndex: null,
    selectedTextField: null,
    
    // Canvas interaction
    isDragging: false,
    isResizing: false,
    resizeStartSize: 0,
    resizeStartPos: { x: 0, y: 0 },
    dragStartPos: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    activeHandle: null,
    
    // Generated badges
    generatedBadges: [],
    
    // UI state
    showGrid: true,
    darkMode: false
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// =====================
// Simple client-side auth
// NOTE: Credentials are stored client-side (not secure). For real security use server-side auth.
// =====================
const AUTH = {
    // base64 encoded username:password entries
    users: [
        'aGFtaXR0aTQwOTA6YW5hbmFzMTQ1MzIx',
        'aWxlcmllbmdsaXNoY2x1YnM6RmE3I3FMOXYhWnhSMnNLcA=='
    ],
    maxAttempts: 5
};

// add special account for recepmert (kept encoded in memory)
try {
    AUTH.users.push(btoa('recepmert:r3c3pm3rt'));
} catch (e) { /* ignore in older browsers */ }

function checkAuth(username, password) {
    const encoded = btoa(username + ':' + password);
    return AUTH.users.includes(encoded);
}

function showLoginOverlay(show) {
    const overlay = document.getElementById('loginOverlay');
    if (!overlay) return;
    overlay.style.display = show ? 'flex' : 'none';
}

// Gate the app UI until authenticated
(function initLogin() {
    let attempts = parseInt(sessionStorage.getItem('loginAttempts') || '0', 10);
    const authed = sessionStorage.getItem('authed') === '1';
    if (authed) {
        showLoginOverlay(false);
        return;
    }
    showLoginOverlay(true);

    const loginBtn = document.getElementById('loginBtn');
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');
    const msg = document.getElementById('loginMsg');

    loginBtn.addEventListener('click', () => {
        if (attempts >= AUTH.maxAttempts) {
            msg.textContent = 'Hesap kilitlendi. Lütfen daha sonra tekrar deneyin.';
            return;
        }
        const u = userInput.value.trim();
        const p = passInput.value;
        if (checkAuth(u, p)) {
            sessionStorage.setItem('authed', '1');
            showLoginOverlay(false);
            msg.textContent = '';
            attempts = 0;
            sessionStorage.setItem('loginAttempts', '0');
            console.log('User logged in:', u);
        } else {
            attempts++;
            sessionStorage.setItem('loginAttempts', attempts.toString());
            msg.textContent = `Giriş başarısız (${attempts}/${AUTH.maxAttempts})`;
            if (attempts >= AUTH.maxAttempts) {
                msg.textContent = 'Çok fazla başarısız deneme — hesap geçici olarak kilitlendi.';
            }
        }
    });
})();

function initializeApp() {
    console.log('Initializing MUN Badge Generator...');
    
    // Initialize event listeners
    initializeUploadZones();
    initializeThemeToggle();
    initializeCanvasInteractions();
    initializeParticipantSearch();
    initializeGalleryToggle();
    initializeDownloadButton();
    initializeSyncButton();
    showSpecialWelcome();
    
    // Check for dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
        toggleDarkMode();
    }
    
    console.log('Application initialized successfully');
}

function showSpecialWelcome() {
    try {
        // recepmertclk için özel karşılama
        if (sessionStorage.getItem('welcomeRecepMert') === '1') {
            sessionStorage.removeItem('welcomeRecepMert');
            // Ses ve konfeti başlat
            playWelcomeSounds();
            launchConfetti();
            const toast = document.createElement('div');
            toast.innerHTML = `
                <div style="font-size:3.2rem;font-weight:900;letter-spacing:2px;line-height:1.1;">
                    Hoşgeldin <span style="color:#ff2d55;text-shadow:0 0 18px #fff,0 0 42px #ff2d55;">Mert</span>
                </div>
                <div style="font-size:2.5rem;margin-top:14px;display:flex;justify-content:center;gap:22px;">
                    <span class="welcome-emoji" style="display:inline-block;animation:spin 2.2s linear infinite;">🎉</span>
                    <span class="welcome-emoji" style="display:inline-block;animation:pop 1.2s infinite alternate;">❤️</span>
                    <span class="welcome-emoji" style="display:inline-block;animation:flash 1.5s infinite;">✨</span>
                    <span class="welcome-emoji" style="display:inline-block;animation:spin 2.2s linear reverse infinite;">🥳</span>
                </div>
            `;
            toast.style.position = 'fixed';
            toast.style.top = '60px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%) scale(0.7)';
            toast.style.background = 'radial-gradient(circle at 50% 40%,#ffe066 0%,#ffb6c1 60%,#b2f7ef 100%)';
            toast.style.color = '#222';
            toast.style.fontSize = '2rem';
            toast.style.fontWeight = 'bold';
            toast.style.padding = '38px 64px 34px 64px';
            toast.style.borderRadius = '38px';
            toast.style.boxShadow = '0 16px 64px 0 rgba(255,45,85,0.22),0 2px 32px 0 rgba(0,0,0,0.14)';
            toast.style.zIndex = '9999';
            toast.style.textAlign = 'center';
            toast.style.letterSpacing = '2px';
            toast.style.userSelect = 'none';
            toast.style.transition = 'transform 0.7s cubic-bezier(.68,-0.55,.27,1.55), opacity 0.7s';
            toast.style.opacity = '0';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.transform = 'translateX(-50%) scale(1)';
                toast.style.opacity = '1';
            }, 80);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) scale(0.7)';
                setTimeout(() => toast.remove(), 900);
            }, 4800);
            // Animasyon stilleri ekle
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin { 0%{transform:rotate(0deg);} 100%{transform:rotate(360deg);} }
                @keyframes pop { 0%{transform:scale(1);} 100%{transform:scale(1.45);} }
                @keyframes flash { 0%,100%{filter:brightness(1);} 50%{filter:brightness(2.5);} }
            `;
            document.head.appendChild(style);
            setTimeout(()=>{ style.remove(); }, 6000);
        }
        // Eski özel karşılama (recepmert)
        if (sessionStorage.getItem('welcomeRecep') === '1') {
            sessionStorage.removeItem('welcomeRecep');
            const topBar = document.querySelector('.top-bar') || document.body;
            const msg = document.createElement('div');
            msg.className = 'panel';
            msg.style.position = 'fixed';
            msg.style.top = '80px';
            msg.style.left = '50%';
            msg.style.transform = 'translateX(-50%)';
            msg.style.zIndex = 2000;
            msg.style.padding = '12px 18px';
            msg.style.borderRadius = '8px';
            msg.style.background = 'linear-gradient(90deg,#ff6b6b,#ff8e53)';
            msg.style.color = 'white';
            msg.style.fontWeight = '700';
            msg.textContent = 'Hoşgeldin Mert ❤️';
            document.body.appendChild(msg);
            setTimeout(() => { msg.style.transition = 'opacity 400ms'; msg.style.opacity = '0'; }, 2200);
            setTimeout(() => { msg.remove(); }, 2600);
        }
    } catch (e) { console.error(e); }
}

function initializeSyncButton() {
    const btn = document.getElementById('syncParticipants');
    if (!btn) return;
    btn.addEventListener('click', () => {
        // Basic sync: re-generate master settings, refresh participant list, re-render badge
        generateMasterSettings();
        updateParticipantList();
        renderBadge();
        console.log('Participants synced');
    });
}

// ============================================
// File Upload Handling
// ============================================

function initializeUploadZones() {
    // Template upload
    setupUploadZone('template', 'templateUpload', 'templateUploadZone', 'templatePreview', handleTemplateUpload);
    
    // CSV upload
    setupUploadZone('csv', 'csvUpload', 'csvUploadZone', 'csvPreview', handleCSVUpload);
    
    // Back cover upload
    setupUploadZone('backCover', 'backCoverUpload', 'backCoverUploadZone', 'backCoverPreview', handleBackCoverUpload);
    
    // Font upload
    setupUploadZone('font', 'fontUpload', 'fontUploadZone', 'fontPreview', handleFontUpload);
}

function setupUploadZone(type, inputId, zoneId, previewId, handler) {
    const input = document.getElementById(inputId);
    const zone = document.getElementById(zoneId);
    const preview = document.getElementById(previewId);
    
    // Click to upload
    zone.addEventListener('click', () => input.click());
    
    // File input change
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handler(file, preview);
        }
    });
    
    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handler(file, preview);
        }
    });
}

function handleTemplateUpload(file, previewEl) {
    console.log('Uploading template:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            AppState.templateImage = img;
            previewEl.textContent = `✓ ${file.name} (${img.width}×${img.height}px)`;
            previewEl.classList.remove('hidden');
            
            // Resize canvas to match template
            const canvas = document.getElementById('badgeCanvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            renderBadge();
            updateCanvasInfo();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleCSVUpload(file, previewEl) {
    console.log('Uploading CSV:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvText = e.target.result;
        parseCSV(csvText);
        
    previewEl.textContent = `✓ ${file.name} (${AppState.csvData.length} participants)`;
        previewEl.classList.remove('hidden');
        
        updateParticipantList();
        generateMasterSettings();
        renderBadge();
        updateCanvasInfo();
    };
    reader.readAsText(file);
}

function handleBackCoverUpload(file, previewEl) {
    console.log('Uploading back cover:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            AppState.backCoverImage = img;
            previewEl.textContent = `✓ ${file.name}`;
            previewEl.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function handleFontUpload(file, previewEl) {
    console.log('Uploading custom font:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const fontName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const fontFace = new FontFace(fontName, `url(${e.target.result})`);
        
        fontFace.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            AppState.customFonts[fontName] = true;
            
            previewEl.textContent = `✓ ${fontName} loaded`;
            previewEl.classList.remove('hidden');
            
            // Update font dropdowns
            updateFontDropdowns();
            
            console.log(`Font "${fontName}" loaded successfully`);
        }).catch((error) => {
            console.error('Font loading failed:', error);
            previewEl.textContent = `✗ Failed to load font`;
            previewEl.classList.remove('hidden');
        });
    };
    reader.readAsDataURL(file);
}

// ============================================
// CSV Parsing
// ============================================

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return;
    
    // Parse first line to detect headers
    const firstLine = parseCSVLine(lines[0]);
    
    // Check if first line looks like headers (non-numeric, descriptive)
    const hasHeaders = firstLine.some(cell => isNaN(cell) && cell.length > 1);
    
    if (hasHeaders) {
        AppState.csvHeaders = firstLine;
        AppState.csvData = lines.slice(1).map(line => parseCSVLine(line));
    } else {
        // No headers - use default column names
        AppState.csvHeaders = firstLine.map((_, i) => {
            if (i === 0) return 'Name';
            if (i === 1) return 'Committee/Country';
            if (i === 2) return 'Role';
            return `Column ${i + 1}`;
        });
        AppState.csvData = lines.map(line => parseCSVLine(line));
    }
    
    console.log('CSV parsed:', AppState.csvData.length, 'participants,', AppState.csvHeaders.length, 'columns');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// ============================================
// Master Settings Generation
// ============================================

function generateMasterSettings() {
    const container = document.getElementById('masterTextFields');
    container.innerHTML = '';
    
    // Create default master settings for each column
    AppState.masterSettings = {};
    
    AppState.csvHeaders.forEach((header, index) => {
    const fieldId = `field_${index}`;
        
        // Default settings
        AppState.masterSettings[fieldId] = {
            font: 'Montserrat',
            fontSize: index === 0 ? 48 : (index === 1 ? 32 : 24), // Larger for name
            x: 50,
            y: 100 + (index * 100),
            maxWidth: 500,
            alignment: 'center',
            color: '#000000',
            shadowColor: '#000000',
            shadowOpacity: 0.3,
            shadowBlur: 4
        };
        
        // Create UI for this field
        const fieldGroup = createTextFieldControls(header, fieldId, true);
        container.appendChild(fieldGroup);
    });
}

function createTextFieldControls(fieldName, fieldId, isMaster = true) {
    const settings = isMaster ? AppState.masterSettings[fieldId] : 
                     (AppState.participantOverrides[AppState.currentParticipantIndex]?.[fieldId] || AppState.masterSettings[fieldId]);
    
    const group = document.createElement('div');
    group.className = 'text-field-group';
    group.dataset.fieldId = fieldId;
    
    group.innerHTML = `
        <div class="text-field-header">${fieldName}</div>
        
        <div class="control-row">
            <div class="control-group">
                <label class="control-label">Font</label>
                <select class="font-select" data-field="${fieldId}" data-master="${isMaster}">
                    <option value="Montserrat">Montserrat (Bold)</option>
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                </select>
            </div>
            <div class="control-group">
                <label class="control-label">Size (px)</label>
                <input type="number" class="font-size-input" value="${settings.fontSize}" 
                       min="8" max="200" data-field="${fieldId}" data-master="${isMaster}">
            </div>
        </div>
        
        <div class="control-row">
            <div class="control-group">
                <label class="control-label">X Position</label>
                <input type="number" class="x-input" value="${settings.x}" 
                       min="0" data-field="${fieldId}" data-master="${isMaster}">
            </div>
            <div class="control-group">
                <label class="control-label">Y Position</label>
                <input type="number" class="y-input" value="${settings.y}" 
                       min="0" data-field="${fieldId}" data-master="${isMaster}">
            </div>
        </div>
        
        <div class="control-row">
            <div class="control-group">
                <label class="control-label">Max Width</label>
                <input type="number" class="max-width-input" value="${settings.maxWidth}" 
                       min="50" data-field="${fieldId}" data-master="${isMaster}">
            </div>
            <div class="control-group">
                <label class="control-label">Alignment</label>
                <select class="alignment-select" data-field="${fieldId}" data-master="${isMaster}">
                    <option value="left">Left</option>
                    <option value="center" selected>Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
        
        <div class="control-row full">
            <div class="control-group">
                <label class="control-label">Text Color</label>
                <input type="color" class="color-input" value="${settings.color}" 
                       data-field="${fieldId}" data-master="${isMaster}">
            </div>
        </div>
        
        <div class="control-row">
            <div class="control-group">
                <label class="control-label">Shadow Color</label>
                <input type="color" class="shadow-color-input" value="${settings.shadowColor}" 
                       data-field="${fieldId}" data-master="${isMaster}">
            </div>
            <div class="control-group">
                <label class="control-label">Shadow Blur</label>
                <input type="range" class="shadow-blur-input" value="${settings.shadowBlur}" 
                       min="0" max="20" data-field="${fieldId}" data-master="${isMaster}">
            </div>
        </div>
        
        <div class="control-row full">
            <div class="control-group">
                <label class="control-label">Shadow Opacity</label>
                <input type="range" class="shadow-opacity-input" value="${settings.shadowOpacity * 100}" 
                       min="0" max="100" data-field="${fieldId}" data-master="${isMaster}">
            </div>
        </div>
    `;
    
    // Set selected values
    group.querySelector('.font-select').value = settings.font;
    group.querySelector('.alignment-select').value = settings.alignment;
    
    // Add event listeners
    addFieldEventListeners(group, fieldId, isMaster);
    
    return group;
}

function addFieldEventListeners(group, fieldId, isMaster) {
    const inputs = group.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            updateFieldSetting(fieldId, e.target, isMaster);
            
            // Update handles if this is the selected field
            if (AppState.selectedTextField === fieldId) {
                updateHandles();
            }
        });
    });
}

function updateFieldSetting(fieldId, input, isMaster) {
    const settingsTarget = isMaster ? AppState.masterSettings : 
        (AppState.participantOverrides[AppState.currentParticipantIndex] = 
         AppState.participantOverrides[AppState.currentParticipantIndex] || {});
    
    if (!settingsTarget[fieldId]) {
        settingsTarget[fieldId] = { ...AppState.masterSettings[fieldId] };
    }
    
    const setting = settingsTarget[fieldId];
    
    // Update the appropriate setting
    if (input.classList.contains('font-select')) {
        setting.font = input.value;
    } else if (input.classList.contains('font-size-input')) {
        setting.fontSize = parseInt(input.value);
    } else if (input.classList.contains('x-input')) {
        setting.x = parseInt(input.value);
    } else if (input.classList.contains('y-input')) {
        setting.y = parseInt(input.value);
    } else if (input.classList.contains('max-width-input')) {
        setting.maxWidth = parseInt(input.value);
    } else if (input.classList.contains('alignment-select')) {
        setting.alignment = input.value;
    } else if (input.classList.contains('color-input')) {
        setting.color = input.value;
    } else if (input.classList.contains('shadow-color-input')) {
        setting.shadowColor = input.value;
    } else if (input.classList.contains('shadow-blur-input')) {
        setting.shadowBlur = parseInt(input.value);
    } else if (input.classList.contains('shadow-opacity-input')) {
        setting.shadowOpacity = parseInt(input.value) / 100;
    }
    
    // --- Panelde override yapılınca, sadece aynı komite ve aynı rol kombinasyonuna sahip katılımcıların ilgili alanı topluca güncellenir (isim alanı hariç) ---
    if (!isMaster && AppState.csvHeaders && AppState.currentParticipantIndex !== null && AppState.currentParticipantIndex >= 0) {
        const nameFields = ['isim', 'name', 'full name'];
        const fieldName = AppState.csvHeaders[fieldId]?.toLowerCase?.() || '';
        if (!nameFields.some(n => fieldName.includes(n))) {
            // Komite ve rol alanlarının indexlerini bul
            const lowerHeaders = AppState.csvHeaders.map(h => h.toLowerCase());
            const komiteIdx = lowerHeaders.findIndex(h => h.includes('komite') || h.includes('committee'));
            const rolIdx = lowerHeaders.findIndex(h => h.includes('rol') || h.includes('role'));
            if (komiteIdx === -1 || rolIdx === -1) {
                // Komite ve rol yoksa, sadece aynı yazı olanlara uygula (eski davranış)
                const currentText = AppState.csvData[AppState.currentParticipantIndex][fieldId];
                for (let i = 0; i < AppState.csvData.length; i++) {
                    if (AppState.csvData[i][fieldId] === currentText) {
                        AppState.participantOverrides[i] = AppState.participantOverrides[i] || {};
                        const target = AppState.participantOverrides[i][fieldId] = AppState.participantOverrides[i][fieldId] || { ...AppState.masterSettings[fieldId] };
                        if (input.classList.contains('font-select')) {
                            target.font = input.value;
                        } else if (input.classList.contains('font-size-input')) {
                            target.fontSize = parseInt(input.value);
                        } else if (input.classList.contains('x-input')) {
                            target.x = parseInt(input.value);
                        } else if (input.classList.contains('y-input')) {
                            target.y = parseInt(input.value);
                        } else if (input.classList.contains('max-width-input')) {
                            target.maxWidth = parseInt(input.value);
                        } else if (input.classList.contains('alignment-select')) {
                            target.alignment = input.value;
                        } else if (input.classList.contains('color-input')) {
                            target.color = input.value;
                        } else if (input.classList.contains('shadow-color-input')) {
                            target.shadowColor = input.value;
                        } else if (input.classList.contains('shadow-blur-input')) {
                            target.shadowBlur = parseInt(input.value);
                        } else if (input.classList.contains('shadow-opacity-input')) {
                            target.shadowOpacity = parseInt(input.value) / 100;
                        }
                    }
                }
            } else {
                // Komite ve rol aynıysa uygula
                const currentKomite = AppState.csvData[AppState.currentParticipantIndex][komiteIdx];
                const currentRol = AppState.csvData[AppState.currentParticipantIndex][rolIdx];
                for (let i = 0; i < AppState.csvData.length; i++) {
                    if (
                        AppState.csvData[i][komiteIdx] === currentKomite &&
                        AppState.csvData[i][rolIdx] === currentRol
                    ) {
                        AppState.participantOverrides[i] = AppState.participantOverrides[i] || {};
                        const target = AppState.participantOverrides[i][fieldId] = AppState.participantOverrides[i][fieldId] || { ...AppState.masterSettings[fieldId] };
                        if (input.classList.contains('font-select')) {
                            target.font = input.value;
                        } else if (input.classList.contains('font-size-input')) {
                            target.fontSize = parseInt(input.value);
                        } else if (input.classList.contains('x-input')) {
                            target.x = parseInt(input.value);
                        } else if (input.classList.contains('y-input')) {
                            target.y = parseInt(input.value);
                        } else if (input.classList.contains('max-width-input')) {
                            target.maxWidth = parseInt(input.value);
                        } else if (input.classList.contains('alignment-select')) {
                            target.alignment = input.value;
                        } else if (input.classList.contains('color-input')) {
                            target.color = input.value;
                        } else if (input.classList.contains('shadow-color-input')) {
                            target.shadowColor = input.value;
                        } else if (input.classList.contains('shadow-blur-input')) {
                            target.shadowBlur = parseInt(input.value);
                        } else if (input.classList.contains('shadow-opacity-input')) {
                            target.shadowOpacity = parseInt(input.value) / 100;
                        }
                    }
                }
            }
            renderBadge();
            return;
        }
    }
    renderBadge();
}

// ============================================
// Participant List Management
// ============================================

function updateParticipantList() {
    const container = document.getElementById('participantList');
    container.innerHTML = '';
    // Always include main/template page at the top
    const mainItem = document.createElement('div');
    mainItem.className = 'participant-item';
    mainItem.dataset.index = -1;
    mainItem.innerHTML = `
        <div class="participant-name"><b>Ana Sayfa (Şablon)</b></div>
        <div class="participant-info">Tüm sayfalara uygulanır</div>
    `;
    mainItem.addEventListener('click', () => selectParticipant(-1));
    container.appendChild(mainItem);

    if (AppState.csvData.length === 0) {
        container.innerHTML += `
            <div class="empty-state">
                <span class="empty-icon">👥</span>
                <p>No participants loaded</p>
                <small>Upload a CSV file to get started</small>
            </div>
        `;
        return;
    }
    
    AppState.csvData.forEach((participant, index) => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.dataset.index = index;
        
        const name = participant[0] || 'Unknown';
        const info = participant.slice(1).filter(Boolean).join(' • ') || 'No additional info';
        
        const hasOverrides = AppState.participantOverrides[index];
        const overrideCount = hasOverrides ? Object.keys(hasOverrides).length : 0;
        
        item.innerHTML = `
            <div class="participant-name">${name}</div>
            <div class="participant-info">${info}</div>
        ${overrideCount > 0 ? `<span class="override-badge">${overrideCount} overrides</span>` : ''}
        `;
        
        item.addEventListener('click', () => selectParticipant(index));
        container.appendChild(item);
    });
    
    // Update stats
    const statsEl = document.getElementById('participantStats');
    statsEl.classList.remove('hidden');
    document.getElementById('statsText').textContent = `${AppState.csvData.length} participants`;

    // Auto-select main page by default if nothing selected
    if (AppState.currentParticipantIndex === null) {
        selectParticipant(-1);
    }
}

function selectParticipant(index) {
    AppState.currentParticipantIndex = index;

    // Update UI active state based on dataset index
    document.querySelectorAll('.participant-item').forEach(item => {
        const idx = parseInt(item.dataset.index || item.getAttribute('data-index'));
        item.classList.toggle('active', idx === index);
    });

    // Show override or master panel
    if (index === -1) {
        showOverridePanel(-1, true);
    } else {
        showOverridePanel(index, false);
    }

    // Select first text field by default
    if (AppState.csvHeaders && AppState.csvHeaders.length > 0) {
        AppState.selectedTextField = 'field_0';
    }

    // Render and update UI
    renderBadge();
    updateCanvasTitle();
    updateHandles();
}

function showOverridePanel(index, isMainPage = false) {
    const panel = document.getElementById('overrideSettingsPanel');
    const nameEl = document.getElementById('overrideParticipantName');
    const container = document.getElementById('overrideTextFields');

    panel.classList.remove('hidden');
    container.innerHTML = '';

    if (isMainPage || index === -1) {
        nameEl.textContent = 'Ana Sayfa (Şablon)';
        // Show master controls (editable) so changes apply to AppState.masterSettings
        AppState.csvHeaders.forEach((header, fieldIndex) => {
            const fieldId = `field_${fieldIndex}`;
            const fieldGroup = createTextFieldControls(header, fieldId, true);
            container.appendChild(fieldGroup);
        });

        // Clear overrides button clears all participant overrides
        document.getElementById('clearOverrides').onclick = () => {
            AppState.participantOverrides = {};
            showOverridePanel(-1, true);
            renderBadge();
            updateParticipantList();
        };
        return;
    }

    // Participant-specific override panel
    const participant = AppState.csvData[index];
    const name = participant[0] || 'Unknown';
    nameEl.textContent = `Override: ${name}`;

    // Tüm başlıklar için override alanlarını sırayla ekle
    for (let fieldIndex = 0; fieldIndex < AppState.csvHeaders.length; fieldIndex++) {
    const header = AppState.csvHeaders[fieldIndex];
    const fieldId = `field_${fieldIndex}`;
    const fieldGroup = createTextFieldControls(header, fieldId, false);
    container.appendChild(fieldGroup);
    }

    document.getElementById('clearOverrides').onclick = () => {
        delete AppState.participantOverrides[index];
        showOverridePanel(index, false);
        renderBadge();
        updateParticipantList();
    };
}

function initializeParticipantSearch() {
    const searchInput = document.getElementById('participantSearch');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        document.querySelectorAll('.participant-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
}

// ============================================
// Canvas Rendering
// ============================================

function renderBadge() {
    const canvas = document.getElementById('badgeCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if enabled
    if (AppState.showGrid) {
        drawGrid(ctx, canvas.width, canvas.height);
    }
    
    // Draw template
    if (AppState.templateImage) {
        ctx.drawImage(AppState.templateImage, 0, 0, canvas.width, canvas.height);
    }
    
    // Ensure we have master settings to draw (use defaults if user reset everything)
    ensureMasterSettingsExists();

    // Draw text fields: if a participant is selected, draw their values; otherwise draw master/example texts
    if (AppState.csvData.length > 0 && AppState.currentParticipantIndex !== null && AppState.currentParticipantIndex >= 0) {
        const participant = AppState.csvData[AppState.currentParticipantIndex];
        drawTextFields(ctx, participant, false);
    } else {
        // Draw main/template example using master settings
        drawTextFields(ctx, null, true);
    }
}

// Ensure there are masterSettings to render; create sensible defaults if missing
function ensureMasterSettingsExists() {
    if (Object.keys(AppState.masterSettings || {}).length > 0) return;

    // If CSV headers present, use them; otherwise use sane defaults
    if (!AppState.csvHeaders || AppState.csvHeaders.length === 0) {
        AppState.csvHeaders = ['Name', 'Committee', 'Role'];
    }

    // Generate default master settings
    AppState.masterSettings = {};
    AppState.csvHeaders.forEach((header, index) => {
    const fieldId = `field_${index}`;
        AppState.masterSettings[fieldId] = {
            font: 'Montserrat',
            fontSize: index === 0 ? 48 : (index === 1 ? 32 : 24),
            x: Math.round((document.getElementById('badgeCanvas')?.width || 600) / 2 - 250),
            y: 150 + index * 100,
            maxWidth: 500,
            alignment: 'center',
            color: '#000000',
            shadowColor: '#000000',
            shadowOpacity: 0.0,
            shadowBlur: 0
        };
    });

    // Populate master settings UI if panel exists
    const masterContainer = document.getElementById('masterTextFields');
    if (masterContainer) {
        masterContainer.innerHTML = '';
        // Add main page header
        const mainItem = document.createElement('div');
        mainItem.className = 'participant-item';
        mainItem.dataset.index = -1;
        mainItem.innerHTML = `
            <div class="participant-name"><b>Ana Sayfa (Şablon)</b></div>
            <div class="participant-info">Tüm sayfalara uygulanır</div>
        `;
        masterContainer.appendChild(mainItem);

        AppState.csvHeaders.forEach((header, index) => {
            const fieldId = `field_${index}`;
            const fieldGroup = createTextFieldControls(header, fieldId, true);
            masterContainer.appendChild(fieldGroup);
        });
    }
}

function drawGrid(ctx, width, height) {
    const gridSize = 50;
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Center lines (more visible)
    ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)';
    ctx.lineWidth = 2;
    
    // Vertical center
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Horizontal center
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
}

function drawTextFields(ctx, participant) {
    // Support main page example rendering when participant is null and third arg is true
    const isMainPage = arguments.length >= 3 ? arguments[2] : false;
    AppState.csvHeaders.forEach((header, index) => {
        const fieldId = `field_${index}`;
        let text = '';

        if (isMainPage) {
            text = `${header} (örnek)`;
        } else {
            text = (participant && participant[index]) || '';
            // apply participant override value if present
            const overrideVal = AppState.participantOverrides[AppState.currentParticipantIndex]?.[fieldId]?.value;
            if (overrideVal !== undefined) text = overrideVal;
        }

        // Ensure master settings exist
        const settings = AppState.masterSettings[fieldId];
        if (!settings) return;

        // Use merged settings for rendering
        const merged = { ...settings, ...(AppState.participantOverrides[AppState.currentParticipantIndex]?.[fieldId] || {}) };

        // Apply text styling
        ctx.font = `bold ${merged.fontSize}px ${merged.font}`;
        ctx.fillStyle = merged.color;
        ctx.textAlign = merged.alignment;

        // Apply shadow
        if (merged.shadowOpacity > 0) {
            const shadowAlpha = Math.round(merged.shadowOpacity * 255).toString(16).padStart(2, '0');
            ctx.shadowColor = merged.shadowColor + shadowAlpha;
            ctx.shadowBlur = merged.shadowBlur;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }

        ctx.globalAlpha = 1;

        let textX = merged.x;
        if (merged.alignment === 'center') textX = merged.x + merged.maxWidth / 2;
        else if (merged.alignment === 'right') textX = merged.x + merged.maxWidth;

        const textWidth = ctx.measureText(text).width;
        if (textWidth > merged.maxWidth) {
            drawWrappedText(ctx, text, textX, merged.y, merged.maxWidth, merged.fontSize * 1.2);
        } else {
            ctx.fillText(text, textX, merged.y);
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    });
}

// Return a mutable settings object for editing: participant override if editing participant, or master if main
function getMutableFieldSettings(fieldId) {
    const pIdx = AppState.currentParticipantIndex;
    // Main page or no participant: edit master
    if (pIdx === -1 || pIdx === null) {
        if (!AppState.masterSettings[fieldId]) {
            ensureMasterSettingsExists();
        }
        return AppState.masterSettings[fieldId];
    }

    // Alan başlığı (Name, İsim, Full Name) hariç, aynı değere sahip diğer katılımcıların override'ı da güncellensin
    const header = AppState.csvHeaders[parseInt(fieldId.split('_')[1])] || '';
    const isNameField = /^(name|isim|full name)$/i.test(header.trim());
    const value = AppState.csvData[pIdx]?.[parseInt(fieldId.split('_')[1])];

    // Eğer isim alanı değilse ve değer boş değilse, aynı değere sahip tüm katılımcıların override'ı güncellensin
    if (!isNameField && value) {
        // Önce override nesnesini oluştur
        AppState.participantOverrides[pIdx] = AppState.participantOverrides[pIdx] || {};
        if (!AppState.participantOverrides[pIdx][fieldId]) {
            AppState.participantOverrides[pIdx][fieldId] = { ...AppState.masterSettings[fieldId] };
        }
        // Tüm katılımcılarda aynı değere sahip olanların override'ını da oluştur
        AppState.csvData.forEach((row, idx) => {
            if (idx !== pIdx && row[parseInt(fieldId.split('_')[1])] === value) {
                AppState.participantOverrides[idx] = AppState.participantOverrides[idx] || {};
                if (!AppState.participantOverrides[idx][fieldId]) {
                    AppState.participantOverrides[idx][fieldId] = { ...AppState.masterSettings[fieldId] };
                }
            }
        });
        // Geriye, bu değere sahip ilk override'ı döndür (tümünü referans olarak güncelleyeceğiz)
        return AppState.participantOverrides[pIdx][fieldId];
    }

    // Sadece bu katılımcı için override oluştur
    AppState.participantOverrides[pIdx] = AppState.participantOverrides[pIdx] || {};
    if (!AppState.participantOverrides[pIdx][fieldId]) {
        AppState.participantOverrides[pIdx][fieldId] = { ...AppState.masterSettings[fieldId] };
    }
    return AppState.participantOverrides[pIdx][fieldId];
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    words.forEach((word, index) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && index > 0) {
            ctx.fillText(line, x, currentY);
            line = word + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    });
    
    ctx.fillText(line, x, currentY);
}

// ============================================
// Canvas Interactions
// ============================================

function initializeCanvasInteractions() {
    const canvas = document.getElementById('badgeCanvas');
    const wrapper = document.getElementById('canvasWrapper');
    
    // Grid toggle
    document.getElementById('showGrid').addEventListener('change', (e) => {
        AppState.showGrid = e.target.checked;
        renderBadge();
    });
    
    // Mouse events for drag and drop
    wrapper.addEventListener('mousedown', handleCanvasMouseDown);
    wrapper.addEventListener('mousemove', handleCanvasMouseMove);
    wrapper.addEventListener('mouseup', handleCanvasMouseUp);
    wrapper.addEventListener('mouseleave', handleCanvasMouseUp);
    
    // Update handles when participant changes
    wrapper.addEventListener('click', handleCanvasClick);
}

function handleCanvasMouseDown(e) {
    const canvas = document.getElementById('badgeCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates to canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Check if clicking on a resize handle
    const handle = findHandleAtPosition(e.clientX, e.clientY);
    if (handle) {
        e.preventDefault();
        AppState.isResizing = true;
        AppState.activeHandle = handle;
        AppState.resizeStartPos = { x: canvasX, y: canvasY };
        const settings = getFieldSettings(handle.fieldId);
        // Use mutable settings for resizing so overrides are created when needed
        const mutable = getMutableFieldSettings(handle.fieldId);
        AppState.resizeStartSize = mutable.fontSize;
        console.log('resize start:', handle.fieldId, 'startSize=', AppState.resizeStartSize, 'currentParticipant=', AppState.currentParticipantIndex);
        return;
    }
    
    // Check if clicking on a text field
    const clickedField = findTextFieldAtPosition(canvasX, canvasY);
    
    if (clickedField) {
        AppState.selectedTextField = clickedField;
        AppState.isDragging = true;
        AppState.dragStartPos = { x: canvasX, y: canvasY };
        // Use mutable settings for dragging (creates override when editing participant)
        const mutableSettings = getMutableFieldSettings(clickedField);
        AppState.dragOffset = {
            x: canvasX - mutableSettings.x,
            y: canvasY - mutableSettings.y
        };
        
        updateHandles();
    } else {
        AppState.selectedTextField = null;
        updateHandles();
    }
}

function handleCanvasMouseMove(e) {
    const canvas = document.getElementById('badgeCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Handle resizing
    if (AppState.isResizing && AppState.activeHandle) {
        e.preventDefault();
        const deltaY = canvasY - AppState.resizeStartPos.y;
        // Write into mutable settings so overrides are stored per-participant
        const settings = getMutableFieldSettings(AppState.activeHandle.fieldId);
        const newSize = Math.max(8, Math.min(200, AppState.resizeStartSize - deltaY));
        settings.fontSize = Math.round(newSize);
        console.log('resizing:', AppState.activeHandle.fieldId, 'newSize=', settings.fontSize);
        
        // Update input field
        updateInputValues(AppState.activeHandle.fieldId, settings);
        updateHandles();
        renderBadge();
        return;
    }
    
    // Handle dragging
    if (AppState.isDragging && AppState.selectedTextField) {
        e.preventDefault();
        // Update field position (write to mutable settings so only this participant changes)
        const settings = getMutableFieldSettings(AppState.selectedTextField);
        let newX = Math.round(canvasX - AppState.dragOffset.x);
        let newY = Math.round(canvasY - AppState.dragOffset.y);

        // Snap settings
        const snapDist = 10;
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const fieldId = AppState.selectedTextField;
        const thisSettings = settings;
        const thisWidth = thisSettings.maxWidth;
        const thisHeight = thisSettings.fontSize * 1.5;

        // Snap to badge center/edges
        let snapLines = [];
        // Badge center X
        if (Math.abs((newX + thisWidth/2) - canvasW/2) < snapDist) {
            newX = Math.round(canvasW/2 - thisWidth/2);
            snapLines.push({x: canvasW/2, y1: 0, y2: canvasH});
        }
        // Badge center Y
        if (Math.abs((newY + thisHeight/2) - canvasH/2) < snapDist) {
            newY = Math.round(canvasH/2 - thisHeight/2);
            snapLines.push({y: canvasH/2, x1: 0, x2: canvasW});
        }
        // Badge left/right
        if (Math.abs(newX) < snapDist) { newX = 0; snapLines.push({x:0, y1:0, y2:canvasH}); }
        if (Math.abs((newX+thisWidth)-canvasW) < snapDist) { newX = canvasW-thisWidth; snapLines.push({x:canvasW, y1:0, y2:canvasH}); }
        // Badge top/bottom
        if (Math.abs(newY) < snapDist) { newY = 0; snapLines.push({y:0, x1:0, x2:canvasW}); }
        if (Math.abs((newY+thisHeight)-canvasH) < snapDist) { newY = canvasH-thisHeight; snapLines.push({y:canvasH, x1:0, x2:canvasW}); }

        // Snap to other text fields (center/edges)
        for (let i = 0; i < AppState.csvHeaders.length; i++) {
            const otherId = `field_${i}`;
            if (otherId === fieldId) continue;
            const other = getFieldSettings(otherId);
            const oX = other.x, oY = other.y, oW = other.maxWidth, oH = other.fontSize * 1.5;
            // X align: left, center, right
            if (Math.abs(newX - oX) < snapDist) { newX = oX; snapLines.push({x:oX, y1:0, y2:canvasH}); }
            if (Math.abs((newX+thisWidth/2)-(oX+oW/2)) < snapDist) { newX = Math.round(oX+oW/2-thisWidth/2); snapLines.push({x:oX+oW/2, y1:0, y2:canvasH}); }
            if (Math.abs((newX+thisWidth)-(oX+oW)) < snapDist) { newX = Math.round(oX+oW-thisWidth); snapLines.push({x:oX+oW, y1:0, y2:canvasH}); }
            // Y align: top, center, bottom
            if (Math.abs(newY - oY) < snapDist) { newY = oY; snapLines.push({y:oY, x1:0, x2:canvasW}); }
            if (Math.abs((newY+thisHeight/2)-(oY+oH/2)) < snapDist) { newY = Math.round(oY+oH/2-thisHeight/2); snapLines.push({y:oY+oH/2, x1:0, x2:canvasW}); }
            if (Math.abs((newY+thisHeight)-(oY+oH)) < snapDist) { newY = Math.round(oY+oH-thisHeight); snapLines.push({y:oY+oH, x1:0, x2:canvasW}); }
        }

        settings.x = newX;
        settings.y = newY;

        // Update input fields
        updateInputValues(AppState.selectedTextField, settings);

        // Show snap guides
        showSnapGuides(settings.x, settings.y, snapLines);

        updateHandles();
        renderBadge();
        return;
    }
    
    // Update cursor based on what's under the mouse
    const handle = findHandleAtPosition(e.clientX, e.clientY);
    if (handle) {
        canvas.style.cursor = 'ns-resize';
    } else {
        const field = findTextFieldAtPosition(canvasX, canvasY);
        canvas.style.cursor = field ? 'move' : 'crosshair';
    }
}

function handleCanvasMouseUp() {
    AppState.isDragging = false;
    AppState.isResizing = false;
    AppState.activeHandle = null;
    hideSnapGuides();
}

function handleCanvasClick(e) {
    // This is handled in mousedown, just for completeness
}

function findTextFieldAtPosition(x, y) {
    if (!AppState.csvHeaders) return null;
    
    for (let i = AppState.csvHeaders.length - 1; i >= 0; i--) {
    const fieldId = `field_${i}`;
        const settings = getFieldSettings(fieldId);
        
        // Check if point is within text bounds (approximate)
        const bounds = {
            x: settings.x,
            y: settings.y - settings.fontSize,
            width: settings.maxWidth,
            height: settings.fontSize * 1.5
        };
        
        if (x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height) {
            return fieldId;
        }
    }
    
    return null;
}

function getFieldSettings(fieldId) {
    const participantIndex = AppState.currentParticipantIndex;
    const master = AppState.masterSettings[fieldId] || {};

    // If main page is selected or no participant, return master directly
    if (participantIndex === -1 || participantIndex === null) return master;

    // Merge master + participant override (override keys take precedence)
    const override = AppState.participantOverrides[participantIndex]?.[fieldId];
    if (override) return { ...master, ...override };
    return master;
}

function updateInputValues(fieldId, settings) {
    const isMaster = AppState.currentParticipantIndex === -1;
    const container = isMaster ? 
        document.getElementById('masterTextFields') : 
        document.getElementById('overrideTextFields');
    
    const group = container.querySelector(`[data-field-id="${fieldId}"]`);
    if (!group) return;
    
    group.querySelector('.x-input').value = settings.x;
    group.querySelector('.y-input').value = settings.y;
}

function showSnapGuides(x, y, snapLines = []) {
    const svg = document.getElementById('snapGuides');
    svg.innerHTML = '';
    svg.setAttribute('width', 600);
    svg.setAttribute('height', 900);
    // Eski tek çizgi desteği
    if (typeof x === 'number' && typeof y === 'number' && snapLines.length === 0) {
        const v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        v.setAttribute('x1', x);
        v.setAttribute('x2', x);
        v.setAttribute('y1', 0);
        v.setAttribute('y2', svg.getAttribute('height') || 900);
        v.classList.add('snap-line');
        svg.appendChild(v);
        const h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        h.setAttribute('y1', y);
        h.setAttribute('y2', y);
        h.setAttribute('x1', 0);
        h.setAttribute('x2', svg.getAttribute('width') || 600);
        h.classList.add('snap-line');
        svg.appendChild(h);
        return;
    }
    // Çoklu snap çizgileri
    for (const line of snapLines) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        if (line.x !== undefined) {
            l.setAttribute('x1', line.x);
            l.setAttribute('x2', line.x);
            l.setAttribute('y1', line.y1);
            l.setAttribute('y2', line.y2);
        } else if (line.y !== undefined) {
            l.setAttribute('y1', line.y);
            l.setAttribute('y2', line.y);
            l.setAttribute('x1', line.x1);
            l.setAttribute('x2', line.x2);
        }
        l.classList.add('snap-line');
        svg.appendChild(l);
    }
}

function hideSnapGuides() {
    document.getElementById('snapGuides').innerHTML = '';
}

function updateHandles() {
    const container = document.getElementById('dragHandles');
    container.innerHTML = '';
    
    if (!AppState.selectedTextField || AppState.currentParticipantIndex === null) {
        return;
    }
    
    const canvas = document.getElementById('badgeCanvas');
    const rect = canvas.getBoundingClientRect();
    const settings = getFieldSettings(AppState.selectedTextField);
    
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Calculate text bounds
    const bounds = getTextBounds(AppState.selectedTextField);
    if (!bounds) return;
    
    // Position the container
    container.style.left = rect.left + 'px';
    container.style.top = rect.top + 'px';
    container.style.width = rect.width + 'px';
    container.style.height = rect.height + 'px';
    
    // Create selection box
    const selectionBox = document.createElement('div');
    selectionBox.className = 'text-selection-box';
    selectionBox.style.left = (bounds.x * scaleX) + 'px';
    selectionBox.style.top = (bounds.y * scaleY) + 'px';
    selectionBox.style.width = (bounds.width * scaleX) + 'px';
    selectionBox.style.height = (bounds.height * scaleY) + 'px';
    container.appendChild(selectionBox);
    
    // Create center drag handle
    const centerHandle = document.createElement('div');
    centerHandle.className = 'drag-handle';
    centerHandle.style.left = ((bounds.x + bounds.width / 2) * scaleX) + 'px';
    centerHandle.style.top = ((bounds.y + bounds.height / 2) * scaleY) + 'px';
    centerHandle.dataset.fieldId = AppState.selectedTextField;
    centerHandle.dataset.type = 'move';
    container.appendChild(centerHandle);
    
    // Create resize handles (bottom corners)
    const resizeHandleBottom = document.createElement('div');
    resizeHandleBottom.className = 'resize-handle';
    resizeHandleBottom.style.left = ((bounds.x + bounds.width / 2) * scaleX) + 'px';
    resizeHandleBottom.style.top = ((bounds.y + bounds.height) * scaleY) + 'px';
    resizeHandleBottom.style.cursor = 'ns-resize';
    resizeHandleBottom.dataset.fieldId = AppState.selectedTextField;
    resizeHandleBottom.dataset.type = 'resize';
    container.appendChild(resizeHandleBottom);
    console.log('updateHandles: created resize handle for', AppState.selectedTextField, 'bounds=', bounds);
}

function getTextBounds(fieldId) {
    // If current participant not present (e.g., main page), use master settings and example text
    const index = parseInt(fieldId.split('_')[1]);
    const settings = getFieldSettings(fieldId) || AppState.masterSettings[fieldId];
    const text = (AppState.csvData[AppState.currentParticipantIndex] && AppState.csvData[AppState.currentParticipantIndex][index]) || `${AppState.csvHeaders[index] || 'Text'}`;

    if (!settings) return null;

    return {
        x: settings.x,
        y: settings.y - settings.fontSize,
        width: settings.maxWidth,
        height: settings.fontSize * 1.5
    };
}

function findHandleAtPosition(clientX, clientY) {
    const handles = document.querySelectorAll('.drag-handle, .resize-handle');
    
    for (const handle of handles) {
        const rect = handle.getBoundingClientRect();
        const expandedRect = {
            left: rect.left - 10,
            right: rect.right + 10,
            top: rect.top - 10,
            bottom: rect.bottom + 10
        };
        
        if (clientX >= expandedRect.left && clientX <= expandedRect.right &&
            clientY >= expandedRect.top && clientY <= expandedRect.bottom) {
            return {
                fieldId: handle.dataset.fieldId,
                type: handle.dataset.type,
                element: handle
            };
        }
    }
    
    return null;
}

// ============================================
// Badge Generation & Gallery
// ============================================

async function generateAllBadges() {
    console.log('Generating all badges...');
    AppState.generatedBadges = [];
    
    const canvas = document.getElementById('badgeCanvas');
    const ctx = canvas.getContext('2d');
    
    for (let i = 0; i < AppState.csvData.length; i++) {
    const participant = AppState.csvData[i];
    const name = participant[0] || `Participant_${i + 1}`;
        
        // Clear and render this badge
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (AppState.templateImage) {
            ctx.drawImage(AppState.templateImage, 0, 0, canvas.width, canvas.height);
        }
        
        // Draw text for this participant
        AppState.csvHeaders.forEach((header, fieldIndex) => {
            const fieldId = `field_${fieldIndex}`;
            const text = participant[fieldIndex] || '';
            const settings = AppState.participantOverrides[i]?.[fieldId] || AppState.masterSettings[fieldId];
            
            if (!settings) return;
            
            ctx.font = `bold ${settings.fontSize}px ${settings.font}`;
            ctx.fillStyle = settings.color;
            ctx.textAlign = settings.alignment;
            
            // Apply shadow (with proper alpha handling)
            if (settings.shadowOpacity > 0) {
                const shadowAlpha = Math.round(settings.shadowOpacity * 255).toString(16).padStart(2, '0');
                ctx.shadowColor = settings.shadowColor + shadowAlpha;
                ctx.shadowBlur = settings.shadowBlur;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            
            // Make sure text is fully opaque
            ctx.globalAlpha = 1;
            
            let textX = settings.x;
            if (settings.alignment === 'center') {
                textX = settings.x + settings.maxWidth / 2;
            } else if (settings.alignment === 'right') {
                textX = settings.x + settings.maxWidth;
            }
            
            const textWidth = ctx.measureText(text).width;
            if (textWidth > settings.maxWidth) {
                drawWrappedText(ctx, text, textX, settings.y, settings.maxWidth, settings.fontSize * 1.2);
            } else {
                ctx.fillText(text, textX, settings.y);
            }
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        });
        
        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        AppState.generatedBadges.push({
            name: name,
            blob: blob,
            dataUrl: URL.createObjectURL(blob)
        });
    }
    
    updateGallery();
    console.log(`Generated ${AppState.generatedBadges.length} badges`);
}

function updateGallery() {
    const container = document.getElementById('galleryContent');
    const countEl = document.getElementById('galleryCount');
    const downloadBtn = document.getElementById('downloadAllBtn');
    
    container.innerHTML = '';
    
    if (AppState.generatedBadges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🖼</span>
                <p>No badges generated yet</p>
            </div>
        `;
        downloadBtn.disabled = true;
        return;
    }
    
    AppState.generatedBadges.forEach((badge, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'gallery-thumbnail';
        thumbnail.innerHTML = `
            <img src="${badge.dataUrl}" alt="${badge.name}">
            <div class="gallery-thumbnail-label">${badge.name}</div>
        `;
        
        thumbnail.addEventListener('click', () => {
            selectParticipant(index);
        });
        
        container.appendChild(thumbnail);
    });
    
    countEl.textContent = `${AppState.generatedBadges.length} badges`;
    downloadBtn.disabled = false;
}

// ============================================
// ZIP Download
// ============================================

async function downloadAllAsZIP() {
    console.log('Creating ZIP file...');
    
    if (AppState.generatedBadges.length === 0) {
        await generateAllBadges();
    }
    
    const zip = new JSZip();
    const badgesFolder = zip.folder('badges');
    
    // Track names for duplicate handling
    const nameCount = {};
    
    for (let i = 0; i < AppState.generatedBadges.length; i++) {
        const badge = AppState.generatedBadges[i];
        let filename = sanitizeFilename(badge.name);
        
        // Handle duplicates
        if (nameCount[filename]) {
            nameCount[filename]++;
            const participant = AppState.csvData[i];
            const suffix = participant[1] || nameCount[filename];
            filename = `${filename}_${suffix}`;
        } else {
            nameCount[filename] = 1;
        }
        
    badgesFolder.file(`${filename}.png`, badge.blob);
        
        // Her katılımcı için arka kapak ekle (varsa)
        if (AppState.backCoverImage) {
            const backCoverBlob = await imageToBlob(AppState.backCoverImage);
            badgesFolder.file(`${filename}_back.png`, backCoverBlob);
        }
    }
    
    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'MUN_Badges.zip');
    
    console.log('ZIP download started');
}

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function imageToBlob(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function initializeDownloadButton() {
    document.getElementById('downloadAllBtn').addEventListener('click', async () => {
        await generateAllBadges();
        await downloadAllAsZIP();
    });
}

// ============================================
// Gallery Toggle
// ============================================

function initializeGalleryToggle() {
    const toggleBtn = document.getElementById('toggleGallery');
    const drawer = document.getElementById('galleryDrawer');
    
    toggleBtn.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
    });
}

// ============================================
// Theme Toggle
// ============================================

function initializeThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    toggleBtn.addEventListener('click', toggleDarkMode);
}

function toggleDarkMode() {
    AppState.darkMode = !AppState.darkMode;
    document.body.classList.toggle('dark-mode', AppState.darkMode);
    
    const icon = document.querySelector('.theme-icon');
    icon.textContent = AppState.darkMode ? '☀' : '🌙';
}

// ============================================
// Utility Functions
// ============================================

function updateCanvasTitle() {
    const titleEl = document.getElementById('canvasTitle');
    
    if (AppState.currentParticipantIndex !== null && AppState.csvData[AppState.currentParticipantIndex]) {
        const name = AppState.csvData[AppState.currentParticipantIndex][0] || 'Unknown';
        titleEl.textContent = `Badge Preview: ${name}`;
    } else {
        titleEl.textContent = 'Badge Preview';
    }
}

function updateCanvasInfo() {
    const infoEl = document.getElementById('canvasInfo');
    
    if (!AppState.templateImage) {
        infoEl.textContent = 'Upload a template image to begin';
        return;
    }
    
    if (AppState.csvData.length === 0) {
        infoEl.textContent = 'Upload CSV data to see participants';
        return;
    }
    
    if (AppState.currentParticipantIndex === null) {
        infoEl.textContent = 'Select a participant from the list';
        return;
    }
    
    infoEl.textContent = `Drag text fields to reposition • ${AppState.csvData.length} participants loaded`;
}

function updateFontDropdowns() {
    const selects = document.querySelectorAll('.font-select');
    
    selects.forEach(select => {
        // Add custom fonts to dropdown
        Object.keys(AppState.customFonts).forEach(fontName => {
            if (!Array.from(select.options).some(opt => opt.value === fontName)) {
                const option = document.createElement('option');
                option.value = fontName;
                option.textContent = fontName;
                select.appendChild(option);
            }
        });
    });
}

// ============================================
// Auto-generate badges when ready
// ============================================

// Watch for when both template and CSV are loaded
setInterval(() => {
    if (AppState.templateImage && AppState.csvData.length > 0 && 
        AppState.generatedBadges.length === 0 && AppState.currentParticipantIndex !== null) {
        generateAllBadges();
    }
}, 1000);

console.log('MUN Badge Generator script loaded successfully');