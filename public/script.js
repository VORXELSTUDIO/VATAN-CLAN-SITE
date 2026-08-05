// ============================================
// 𓄂𝐕𝐀𝐓𝐀𝐍࿐ - Complete Application Script
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_URL = window.location.origin;
const SPLASH_DURATION = 3000;
let currentUser = null;
let currentSlide = 0;
let slideInterval = null;
let socket = null;
let currentGame = null;
let currentMode = null;

// اتاق‌های بازی آنلاین
const gameLobbies = {
    tictactoe: { waiting: [], games: new Map() },
    rps: { waiting: [], games: new Map() },
    airbattle: { waiting: [], games: new Map() }
};

// ============================================
// DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        initializeApp();
    }, SPLASH_DURATION);
});

// ============================================
// APP INITIALIZATION
// ============================================
async function initializeApp() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                currentUser = userData;
                updateUIForLoggedInUser(userData);
                initAdmin();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Auth error:', error);
        }
    }

    connectSocket();
    initParticles();
    initMenu();
    initAnnouncementSlider();
    initChat();
    initAuth();
    initGames();
    initAdmin();
    initPageNavigation();
    initFloatingButtons();

    await loadAnnouncements();
    await loadMembers();
    await loadBattles();
}

// ============================================
// PAGE NAVIGATION
// ============================================
function initPageNavigation() {
    const gamesBtn = document.getElementById('gamesBtn');
    if (gamesBtn) {
        gamesBtn.addEventListener('click', () => {
            navigateTo('games');
        });
    }
}

// ============================================
// SOCKET.IO
// ============================================
function connectSocket() {
    if (!socket) {
        try {
            socket = io({
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5
            });
            
            socket.on('connect', () => {
                console.log('🎮 Connected to game server');
            });
            
            socket.on('connect_error', (error) => {
                console.log('⚠️ Socket connection error:', error);
            });
            
            socket.on('game-update', (data) => {
                handleGameUpdate(data);
            });
            
            socket.on('player-joined', (data) => {
                showNotification(`🎮 ${data.playerName} به بازی پیوست`, 'info');
            });
            
            socket.on('player-left', (data) => {
                showNotification('بازیکن دیگر از بازی خارج شد', 'error');
            });
            
            socket.on('game-start', (data) => {
                showNotification('🎮 بازی شروع شد!', 'success');
            });
            
            socket.on('game-finished', (data) => {
                showNotification('🏁 بازی تمام شد!', 'info');
            });
        } catch (error) {
            console.log('⚠️ Socket.IO not available');
        }
    }
    return socket;
}

// ============================================
// BACKGROUND PARTICLES
// ============================================
function initParticles() {
    const container = document.getElementById('bgParticles');
    if (!container) return;
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        container.appendChild(particle);
    }
}

// ============================================
// GLASS MENU
// ============================================
function initMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const glassMenu = document.getElementById('glassMenu');
    const menuItems = document.querySelectorAll('.menu-item');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            glassMenu.classList.toggle('active');
            document.body.style.overflow = glassMenu.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    if (menuClose) {
        menuClose.addEventListener('click', () => {
            glassMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    if (glassMenu) {
        glassMenu.addEventListener('click', (e) => {
            if (e.target === glassMenu) {
                glassMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (page) {
                navigateTo(page);
            }
            
            if (item.id === 'loginBtn') {
                const authModal = document.getElementById('authModal');
                if (authModal) authModal.classList.add('active');
            }
            
            if (item.id === 'logoutBtn') {
                handleLogout();
            }
            
            if (glassMenu) {
                glassMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// ============================================
// NAVIGATE TO
// ============================================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.log('Page not found:', page);
        return;
    }
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    console.log('Navigating to:', page);
    
    switch(page) {
        case 'home':
            loadAnnouncements();
            loadMembers();
            loadBattles();
            break;
        case 'shop':
            loadShop();
            break;
        case 'challenges':
            loadChallenges();
            break;
        case 'tournaments':
            loadTournaments();
            break;
        case 'luck':
            loadLuck();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'admin':
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            if (userData.role === 'admin') {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                const firstTab = document.querySelector('.admin-tab');
                if (firstTab) {
                    firstTab.classList.add('active');
                    const sectionId = `section-${firstTab.dataset.tab}`;
                    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                    const section = document.getElementById(sectionId);
                    if (section) section.classList.add('active');
                    loadAdminTab(firstTab.dataset.tab);
                }
                showNotification('🔐 وارد پنل مدیریت شدید', 'info');
            } else {
                showNotification('⛔ دسترسی محدود به ادمین', 'error');
                navigateTo('home');
            }
            break;
    }
}

// ============================================
// ANNOUNCEMENTS SLIDER
// ============================================
function initAnnouncementSlider() {
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            clearInterval(slideInterval);
            goToSlide(currentSlide - 1);
            startAutoSlide();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            clearInterval(slideInterval);
            goToSlide(currentSlide + 1);
            startAutoSlide();
        });
    }
}

async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_URL}/api/announcements`);
        if (!response.ok) throw new Error('Failed to load announcements');
        const announcements = await response.json();
        renderSlider(announcements);
    } catch (error) {
        console.error('Error loading announcements:', error);
        const defaultAnnouncements = [
            { id: '1', title: 'به اتحاد 𓄂𝐕𝐀𝐓𝐀𝐍࿐ خوش آمدید!', content: 'ما یک اتحادیه قدرتمند هستیم با هدف پیروزی در میدان‌های نبرد.', date: '۱۴۰۴/۰۵/۱۳' },
            { id: '2', title: 'مسابقه هفتگی', content: 'مسابقه هفتگی این هفته روز جمعه ساعت ۲۰ برگزار میشود.', date: '۱۴۰۴/۰۵/۱۲' },
            { id: '3', title: 'بهروزرسانی سایت', content: 'سایت اتحاد به‌روزرسانی شد. امکانات جدید اضافه شد.', date: '۱۴۰۴/۰۵/۱۰' }
        ];
        renderSlider(defaultAnnouncements);
    }
}

function renderSlider(announcements) {
    const track = document.getElementById('sliderTrack');
    const dots = document.getElementById('sliderDots');
    
    if (!track) return;
    
    track.innerHTML = '';
    if (dots) dots.innerHTML = '';
    
    if (!announcements || announcements.length === 0) {
        track.innerHTML = `<div class="announcement-slide"><div class="announcement-title">هیچ اطلاعیه‌ای وجود ندارد</div><div class="announcement-content">به زودی اطلاعیه‌ها اضافه میشوند.</div></div>`;
        return;
    }
    
    announcements.forEach((announcement, index) => {
        const slide = document.createElement('div');
        slide.className = 'announcement-slide';
        slide.innerHTML = `
            <div class="announcement-title">${announcement.title}</div>
            <div class="announcement-date">📅 ${announcement.date || 'تاریخ نامشخص'}</div>
            <div class="announcement-content">${announcement.content}</div>
        `;
        track.appendChild(slide);
        
        if (dots) {
            const dot = document.createElement('div');
            dot.className = 'slider-dot' + (index === 0 ? ' active' : '');
            dot.dataset.index = index;
            dot.addEventListener('click', () => goToSlide(index));
            dots.appendChild(dot);
        }
    });
    
    currentSlide = 0;
    updateSlider();
    startAutoSlide();
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.announcement-slide');
    const dots = document.querySelectorAll('.slider-dot');
    if (slides.length === 0) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentSlide = index;
    updateSlider();
}

function updateSlider() {
    const track = document.getElementById('sliderTrack');
    const slides = document.querySelectorAll('.announcement-slide');
    const dots = document.querySelectorAll('.slider-dot');
    if (!track || slides.length === 0) return;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function startAutoSlide() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        goToSlide(currentSlide + 1);
    }, 5000);
}

// ============================================
// MEMBERS
// ============================================
async function loadMembers() {
    try {
        const response = await fetch(`${API_URL}/api/members`);
        if (!response.ok) throw new Error('Failed to load members');
        const members = await response.json();
        renderMembers(members);
    } catch (error) {
        console.error('Error loading members:', error);
        const defaultMembers = [
            { id: '1', displayName: 'Vatan_Admin', tag: 'مدیر کل', order: 1 },
            { id: '2', displayName: 'Persian_Warrior', tag: 'فرمانده', order: 2 },
            { id: '3', displayName: 'Aryan_Knight', tag: 'جنگجو', order: 3 }
        ];
        renderMembers(defaultMembers);
    }
}

function renderMembers(members) {
    const container = document.getElementById('membersList');
    if (!container) return;
    container.innerHTML = '';
    if (!members || members.length === 0) {
        container.innerHTML = '<div class="member-item">هیچ عضوی ثبت نشده است</div>';
        return;
    }
    members.forEach(member => {
        const item = document.createElement('div');
        item.className = 'member-item';
        const userData = getUserByDisplayName(member.displayName);
        const coins = userData ? userData.coins : 0;
        const rank = getCoinRank(coins);
        const avatar = userData ? userData.avatar || '👤' : '👤';
        item.innerHTML = `
            <div class="member-info">
                <span class="member-avatar">${avatar}</span>
                <span class="member-name">${member.displayName}</span>
                <span class="member-tag">${member.tag || 'عضو'}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// ============================================
// BATTLES
// ============================================
async function loadBattles() {
    try {
        const response = await fetch(`${API_URL}/api/battles`);
        if (!response.ok) throw new Error('Failed to load battles');
        const battles = await response.json();
        renderBattles(battles);
    } catch (error) {
        console.error('Error loading battles:', error);
        const defaultBattles = [
            { id: '1', date: '۱۴۰۴/۰۵/۱۲', opponent: 'اتحاد پارسیان', result: 'پیروزی', description: 'نبرد سخت و نفس‌گیر' },
            { id: '2', date: '۱۴۰۴/۰۵/۱۰', opponent: 'لژیونرها', result: 'شکست', description: 'شکست تلخ' }
        ];
        renderBattles(defaultBattles);
    }
}

function renderBattles(battles) {
    const grid = document.getElementById('battlesGrid');
    const stats = document.getElementById('battlesStats');
    if (!grid) return;
    grid.innerHTML = '';
    if (!battles || battles.length === 0) {
        grid.innerHTML = '<div class="battle-card">هیچ جنگی ثبت نشده است</div>';
        if (stats) stats.innerHTML = '';
        return;
    }
    battles.forEach(battle => {
        const card = document.createElement('div');
        card.className = 'battle-card';
        const resultClass = battle.result === 'پیروزی' ? 'win' : battle.result === 'شکست' ? 'lose' : 'draw';
        card.innerHTML = `
            <div class="battle-date">📅 ${battle.date}</div>
            <div class="battle-opponent">⚔️ ${battle.opponent}</div>
            <div class="battle-result ${resultClass}">${battle.result}</div>
            ${battle.description ? `<div class="battle-description">${battle.description}</div>` : ''}
        `;
        grid.appendChild(card);
    });
    
    if (stats) {
        const wins = battles.filter(b => b.result === 'پیروزی').length;
        const losses = battles.filter(b => b.result === 'شکست').length;
        const draws = battles.filter(b => b.result === 'مساوی').length;
        stats.innerHTML = `
            <div class="stat-item"><div class="stat-value">${wins}</div><div class="stat-label">🏆 پیروزی</div></div>
            <div class="stat-item"><div class="stat-value">${losses}</div><div class="stat-label">💔 شکست</div></div>
            <div class="stat-item"><div class="stat-value">${draws}</div><div class="stat-label">⚖️ مساوی</div></div>
            <div class="stat-item"><div class="stat-value">${battles.length}</div><div class="stat-label">📊 کل جنگ‌ها</div></div>
        `;
    }
}

// ============================================
// CHAT BOT
// ============================================
function initChat() {
    const chatBtn = document.getElementById('chatBtn');
    const chatModal = document.getElementById('chatModal');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    
    if (chatBtn && chatModal) {
        chatBtn.addEventListener('click', () => chatModal.classList.toggle('active'));
    }
    if (chatClose && chatModal) {
        chatClose.addEventListener('click', () => chatModal.classList.remove('active'));
    }
    
    if (chatSend && chatInput) {
        function sendMessage() {
            const message = chatInput.value.trim();
            if (!message) return;
            addChatMessage(message, 'user');
            chatInput.value = '';
            setTimeout(() => {
                const response = getBotResponse(message);
                addChatMessage(response, 'bot');
            }, 500);
        }
        
        chatSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

function addChatMessage(message, type) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${type}`;
    msgDiv.innerHTML = `<div class="message-content">${message}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function getBotResponse(message) {
    const msg = message.toLowerCase();
    const responses = {
        'سلام': 'سلام! 👋 چطور میتونم کمک کنم؟',
        'سکه': '💰 برای کسب سکه میتونید:\n• بازی کنید\n• چالش‌های روزانه\n• مسابقات\n• شانس',
        'بازی': '🎮 ما ۳ بازی داریم:\n• دوز\n• سنگ کاغذ قیچی\n• نبرد هوایی',
        'فروشگاه': '🏪 تگ‌های ویژه، آواتار و ایموجی',
        'چالش': '🏆 هر روز ۳ چالش جدید',
        'مسابقه': '🏅 هر هفته تورنمنت',
        'شانس': '🎰 هر روز ۳ بار شانس',
        'خداحافظ': 'خداحافظ! 🏛️ موفق باشید!'
    };
    for (const [key, value] of Object.entries(responses)) {
        if (msg.includes(key)) return value;
    }
    return '🤔 سوال شما رو متوجه نشدم. درباره سکه، بازی، فروشگاه، چالش، مسابقه یا شانس بپرسید.';
}

// ============================================
// AUTH SYSTEM
// ============================================
function initAuth() {
    const loginBtn = document.getElementById('loginBtn');
    const authModal = document.getElementById('authModal');
    const authModalClose = document.getElementById('authModalClose');
    const loginSubmit = document.getElementById('loginSubmit');
    const registerSubmit = document.getElementById('registerSubmit');
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginBtn && authModal) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.add('active');
        });
    }
    
    if (authModalClose && authModal) {
        authModalClose.addEventListener('click', () => authModal.classList.remove('active'));
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) authModal.classList.remove('active');
        });
    }
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'login') {
                if (loginForm) loginForm.style.display = 'block';
                if (registerForm) registerForm.style.display = 'none';
            } else {
                if (loginForm) loginForm.style.display = 'none';
                if (registerForm) registerForm.style.display = 'block';
            }
        });
    });
    
    if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (registerSubmit) registerSubmit.addEventListener('click', handleRegister);
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRegister();
        });
    }
}

async function handleLogin() {
    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value.trim();
    if (!username || !password) {
        showNotification('لطفاً نام کاربری و رمز عبور را وارد کنید', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            showNotification(data.error || 'خطا در ورود', 'error');
            return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        updateUIForLoggedInUser(data.user);
        initAdmin();
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('active');
        showNotification(`خوش آمدید ${data.user.displayName}! 🏛️`, 'success');
        await loadMembers();
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

async function handleRegister() {
    const displayName = document.getElementById('registerDisplayName')?.value.trim();
    const username = document.getElementById('registerUsername')?.value.trim();
    const password = document.getElementById('registerPassword')?.value.trim();
    if (!displayName || !username || !password) {
        showNotification('لطفاً همه فیلدها را پر کنید', 'error');
        return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(displayName)) {
        showNotification('اسم نمایشی باید فقط شامل حروف انگلیسی باشد', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName, username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            showNotification(data.error || 'خطا در ثبت‌نام', 'error');
            return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        updateUIForLoggedInUser(data.user);
        initAdmin();
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('active');
        showNotification(`ثبت‌نام موفق! به ${data.user.displayName} خوش آمدید! 🏛️`, 'success');
        await loadMembers();
    } catch (error) {
        console.error('Register error:', error);
        showNotification('خطا در ارتباط با سرور', 'error');
    }
}

function updateUIForLoggedInUser(user) {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const coinAmount = document.getElementById('coinAmount');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (usernameDisplay) usernameDisplay.textContent = user.displayName;
    if (coinAmount) coinAmount.textContent = user.coins || 0;
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (adminPanelBtn) {
        if (user.role === 'admin') {
            adminPanelBtn.style.display = 'block';
        } else {
            adminPanelBtn.style.display = 'none';
        }
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    
    const usernameDisplay = document.getElementById('usernameDisplay');
    const coinAmount = document.getElementById('coinAmount');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (usernameDisplay) usernameDisplay.textContent = 'مهمان';
    if (coinAmount) coinAmount.textContent = '0';
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (adminPanelBtn) adminPanelBtn.style.display = 'none';
    showNotification('با موفقیت خارج شدید', 'info');
}

// ============================================
// GAMES
// ============================================
function initGames() {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
        const modes = card.querySelectorAll('.mode-btn');
        modes.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!localStorage.getItem('token')) {
                    showNotification('لطفاً ابتدا وارد شوید', 'error');
                    return;
                }
                modes.forEach(m => m.classList.remove('active'));
                btn.classList.add('active');
                const game = card.dataset.game;
                const mode = btn.dataset.mode;
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                if (mode === 'online') {
                    startOnlineGame(game);
                } else {
                    startGame(game, mode);
                }
            });
        });
    });
}

function startGame(game, mode) {
    currentGame = game;
    currentMode = mode;
    const container = document.getElementById('gameContainer');
    const modal = document.getElementById('gameModal');
    const modalBody = document.getElementById('gameModalBody');
    
    if (!container || !modal || !modalBody) {
        showNotification('خطا در بارگذاری بازی', 'error');
        return;
    }
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    let betAmount = 5;
    if (game === 'airbattle') betAmount = 10;
    if ((userData.coins || 0) < betAmount) {
        showNotification(`سکه کافی نیست! نیاز به ${betAmount} سکه دارید`, 'error');
        return;
    }
    modal.classList.add('active');
    
    // بازی با ربات
    if (game === 'tictactoe') {
        renderBotTicTacToe(modalBody, betAmount);
    } else if (game === 'rps') {
        renderBotRPS(modalBody, betAmount);
    } else if (game === 'airbattle') {
        renderBotAirBattle(modalBody, betAmount);
    }
    
    const closeBtn = document.getElementById('gameModalClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('active');
        };
    }
}

// ============================================
// ONLINE GAME SYSTEM WITH SOCKET.IO
// ============================================

function startOnlineGame(gameType) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.displayName) {
        showNotification('لطفاً ابتدا وارد شوید', 'error');
        return;
    }
    
    // ذخیره gameType برای استفاده در joinCodeBtn
    window._currentGameType = gameType;
    
    let betAmount = 5;
    if (gameType === 'airbattle') betAmount = 10;
    betAmount *= 2;
    
    if ((userData.coins || 0) < betAmount) {
        showNotification(`سکه کافی نیست! نیاز به ${betAmount} سکه دارید`, 'error');
        return;
    }
    
    const modal = document.getElementById('gameModal');
    const modalBody = document.getElementById('gameModalBody');
    
    modal.classList.add('active');
    modalBody.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:20px;">🎮 بازی آنلاین - ${gameType === 'tictactoe' ? 'دوز' : gameType === 'rps' ? 'سنگ کاغذ قیچی' : 'نبرد هوایی'}</h2>
        <div style="text-align:center;margin-bottom:20px;color:var(--gold-light);">
            شرط: ${betAmount} سکه | ${userData.coins} سکه موجود
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;max-width:400px;margin:0 auto;">
            <button class="game-btn" id="createRoomBtn" style="font-size:18px;padding:20px;">
                🏠 ایجاد اتاق جدید
            </button>
            <button class="game-btn secondary" id="joinRandomBtn" style="font-size:18px;padding:20px;">
                🎯 اتصال شانسی
            </button>
        </div>
        
        <div style="text-align:center;margin-top:20px;padding:20px;background:rgba(255,215,0,0.05);border-radius:10px;border:1px solid var(--glass-border);">
            <div style="color:var(--gold-light);font-size:14px;opacity:0.7;" id="lobbyStatus">
                در حال اتصال به سرور...
            </div>
            <div style="margin-top:10px;" id="roomCodeDisplay"></div>
        </div>
        
        <div style="margin-top:15px;text-align:center;">
            <div style="font-size:14px;color:var(--gold-light);opacity:0.7;margin-bottom:8px;">🔑 یا با کد اتاق وارد شوید:</div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                <input type="text" id="joinCodeInput" placeholder="مثلاً ABC123" style="padding:10px 15px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);color:white;width:200px;text-align:center;font-family:'Orbitron',sans-serif;font-size:18px;letter-spacing:2px;text-transform:uppercase;">
                <button class="game-btn secondary" id="joinCodeBtn" style="padding:10px 20px;">🔗 اتصال</button>
            </div>
            <div style="font-size:12px;opacity:0.5;margin-top:5px;">کد ۶ رقمی را از دوست خود دریافت کنید</div>
        </div>
        
        <div class="game-controls" style="margin-top:20px;">
            <button class="game-btn secondary" id="cancelOnlineGame">🚪 انصراف</button>
        </div>
    `;
    
    if (!socket) {
        connectSocket();
    }
    
    if (!socket) {
        showNotification('❌ خطا در اتصال به سرور', 'error');
        return;
    }
    
    socket.off('room-created');
    socket.off('room-joined');
    socket.off('room-error');
    socket.off('waiting');
    socket.off('waiting-timeout');
    socket.off('game-finished');
    socket.off('player-left');
    socket.off('random-search-cancelled');
    
    socket.on('room-created', (data) => {
        console.log('✅ Room created:', data);
        document.getElementById('roomCodeDisplay').innerHTML = `
            <div style="background:linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05));padding:20px;border-radius:12px;border:2px solid var(--gold);animation:roomPulse 2s ease-in-out infinite;">
                <div style="font-size:12px;opacity:0.7;margin-bottom:5px;">🔑 کد اتاق شما:</div>
                <div style="font-size:42px;color:var(--gold);font-family:'Orbitron',sans-serif;font-weight:bold;letter-spacing:4px;text-shadow:0 0 20px rgba(255,215,0,0.3);">
                    ${data.roomCode}
                </div>
                <div style="font-size:12px;opacity:0.5;margin-top:8px;">این کد را به دوست خود بدهید</div>
                <button class="game-btn" id="copyCodeBtn" style="margin-top:10px;padding:8px 25px;font-size:14px;">📋 کپی کد</button>
                <div style="font-size:12px;color:var(--gold-light);opacity:0.7;margin-top:8px;" id="waitingStatus">⏳ منتظر ورود حریف...</div>
            </div>
        `;
        
        document.getElementById('copyCodeBtn').addEventListener('click', () => {
            const textToCopy = `🎮 کد اتاق بازی من: ${data.roomCode}\nدر 𓄂𝐕𝐀𝐓𝐀𝐍࿐ به من بپیوند!`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showNotification('✅ کد اتاق کپی شد!', 'success');
            }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
                showNotification('✅ کد اتاق کپی شد!', 'success');
            });
        });
        
        document.getElementById('createRoomBtn').disabled = true;
        document.getElementById('createRoomBtn').style.opacity = '0.5';
        document.getElementById('joinRandomBtn').disabled = true;
        document.getElementById('joinRandomBtn').style.opacity = '0.5';
        document.getElementById('joinCodeBtn').disabled = true;
        document.getElementById('joinCodeBtn').style.opacity = '0.5';
        document.getElementById('joinCodeInput').disabled = true;
        document.getElementById('joinCodeInput').style.opacity = '0.5';
    });
    
    socket.on('room-joined', (data) => {
        console.log('✅ Room joined:', data);
        document.getElementById('gameModal').classList.remove('active');
        showNotification('🎮 به اتاق پیوستید!', 'success');
    });
    
    socket.on('room-error', (data) => {
        console.log('❌ Room error:', data);
        showNotification(`❌ ${data.error}`, 'error');
    });
    
    socket.on('waiting', (data) => {
        console.log('⏳ Waiting:', data);
        document.getElementById('roomCodeDisplay').innerHTML = `
            <div style="background:rgba(255,215,0,0.05);padding:20px;border-radius:12px;border:1px solid var(--glass-border);">
                <div style="font-size:18px;opacity:0.7;">⏳ در حال جستجوی حریف...</div>
                <div style="font-size:14px;opacity:0.5;margin-top:8px;">لطفاً صبر کنید...</div>
                <div style="font-size:12px;opacity:0.4;margin-top:5px;" id="searchTime">۰ ثانیه</div>
                <button class="game-btn secondary" id="cancelSearchBtn" style="margin-top:10px;padding:8px 20px;font-size:12px;">❌ لغو جستجو</button>
            </div>
        `;
        
        document.getElementById('cancelSearchBtn').addEventListener('click', () => {
            socket.emit('cancel-random-search', {
                gameType: gameType,
                playerName: userData.displayName
            });
        });
        
        document.getElementById('createRoomBtn').disabled = true;
        document.getElementById('createRoomBtn').style.opacity = '0.5';
        document.getElementById('joinRandomBtn').disabled = true;
        document.getElementById('joinRandomBtn').style.opacity = '0.5';
        document.getElementById('joinCodeBtn').disabled = true;
        document.getElementById('joinCodeBtn').style.opacity = '0.5';
        document.getElementById('joinCodeInput').disabled = true;
        document.getElementById('joinCodeInput').style.opacity = '0.5';
        
        let searchTime = 0;
        const searchInterval = setInterval(() => {
            searchTime++;
            const timeEl = document.getElementById('searchTime');
            if (timeEl) timeEl.textContent = `${searchTime} ثانیه`;
        }, 1000);
        
        document.getElementById('cancelOnlineGame')._searchInterval = searchInterval;
    });
    
    socket.on('waiting-timeout', (data) => {
        console.log('⏰ Waiting timeout:', data);
        showNotification('⏰ زمان جستجو به پایان رسید. دوباره امتحان کنید.', 'error');
        document.getElementById('cancelOnlineGame').click();
    });
    
    socket.on('random-search-cancelled', (data) => {
        console.log('❌ Search cancelled:', data);
        showNotification('❌ جستجو لغو شد', 'error');
        document.getElementById('cancelOnlineGame').click();
    });
    
    socket.on('game-start', (data) => {
        console.log('🎮 Game starting:', data);
        const modal = document.getElementById('gameModal');
        if (modal) modal.classList.remove('active');
        showNotification(`🎮 بازی شروع شد! ${data.players[0].name} vs ${data.players[1].name}`, 'success');
        startOnlineGameMatch(gameType, data.players, data.betAmount);
    });
    
    socket.on('game-update', (data) => {
        console.log('🔄 Game update:', data);
        handleGameUpdate(data);
    });
    
    socket.on('game-finished', (data) => {
        console.log('🏁 Game finished:', data);
        showNotification('🏁 بازی تمام شد!', 'info');
    });
    
    socket.on('player-left', (data) => {
        console.log('👋 Player left:', data);
        showNotification(`👋 ${data.playerName || 'بازیکن'} از بازی خارج شد`, 'error');
        document.getElementById('gameModal').classList.remove('active');
    });
    
    document.getElementById('createRoomBtn').addEventListener('click', () => {
        const roomCode = generateRoomCode();
        socket.emit('create-room', {
            gameType: gameType,
            playerName: userData.displayName,
            betAmount: betAmount,
            roomCode: roomCode
        });
    });
    
    document.getElementById('joinRandomBtn').addEventListener('click', () => {
        socket.emit('join-random', {
            gameType: gameType,
            playerName: userData.displayName,
            betAmount: betAmount
        });
    });
    
    document.getElementById('joinCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
        if (!code) {
            showNotification('لطفاً کد را وارد کنید', 'error');
            return;
        }
        if (code.length !== 6) {
            showNotification('کد باید ۶ کاراکتر باشد', 'error');
            return;
        }
        
        // استفاده از gameType ذخیره شده
        const gameType = window._currentGameType || 'tictactoe';
        
        socket.emit('join-room-by-code', {
            gameType: gameType,
            roomCode: code,
            playerName: userData.displayName,
            betAmount: betAmount
        });
    });
    
    document.getElementById('joinCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('joinCodeBtn').click();
        }
    });
    
    document.getElementById('cancelOnlineGame').addEventListener('click', () => {
        modal.classList.remove('active');
        socket.emit('leave-game');
        if (document.getElementById('cancelOnlineGame')._searchInterval) {
            clearInterval(document.getElementById('cancelOnlineGame')._searchInterval);
        }
    });
}

// ============================================
// START ONLINE GAME MATCH
// ============================================
function startOnlineGameMatch(gameType, players, betAmount) {
    const modal = document.getElementById('gameModal');
    const gameModalBody = document.getElementById('gameModalBody');
    
    modal.classList.add('active');
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const isFirstPlayer = players[0].name === userData.displayName;
    
    if (gameType === 'tictactoe') {
        renderOnlineTicTacToe(gameModalBody, players, betAmount, isFirstPlayer);
    } else if (gameType === 'rps') {
        renderOnlineRPS(gameModalBody, players, betAmount, isFirstPlayer);
    } else if (gameType === 'airbattle') {
        renderOnlineAirBattle(gameModalBody, players, betAmount, isFirstPlayer);
    }
}

// ============================================
// ONLINE TIC-TAC-TOE
// ============================================
function renderOnlineTicTacToe(container, players, betAmount, isFirstPlayer) {
    let board = Array(9).fill(null);
    let gameActive = true;
    let myTurn = isFirstPlayer;
    let gameOver = false;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const playerSymbol = isFirstPlayer ? 'X' : 'O';
    const opponentSymbol = isFirstPlayer ? 'O' : 'X';
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:10px;">❌ دوز - 🌐 آنلاین</h2>
        <div style="text-align:center;margin-bottom:5px;color:var(--gold-light);font-size:14px;">
            شرط: ${betAmount} سکه | شما: ${playerSymbol} | حریف: ${opponentSymbol}
        </div>
        <div style="text-align:center;margin-bottom:15px;font-size:14px;opacity:0.7;">
            🆚 ${players[0].name} vs ${players[1].name}
        </div>
        <div class="game-status" id="gameStatus">${myTurn ? '🎯 نوبت شما' : '⏳ نوبت حریف...'}</div>
        <div class="game-board tictactoe" id="gameBoard"></div>
        <div class="game-controls">
            <button class="game-btn secondary" id="quitOnlineGame">🚪 خروج</button>
        </div>
    `;
    
    const boardEl = document.getElementById('gameBoard');
    const statusEl = document.getElementById('gameStatus');
    
    if (!boardEl) return;
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => makeMove(i));
        boardEl.appendChild(cell);
    }
    
    document.getElementById('quitOnlineGame').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('active');
        if (socket) {
            socket.emit('leave-game');
        }
    });
    
    function makeMove(index) {
        if (!gameActive || board[index] || !myTurn || gameOver) return;
        
        board[index] = playerSymbol;
        updateBoard();
        myTurn = false;
        if (statusEl) {
            statusEl.textContent = '⏳ نوبت حریف...';
            statusEl.className = 'game-status waiting';
        }
        
        if (socket) {
            socket.emit('game-move', {
                gameType: 'tictactoe',
                move: index,
                symbol: playerSymbol,
                board: board
            });
        }
        
        if (checkWin(playerSymbol)) {
            gameActive = false;
            gameOver = true;
            if (statusEl) {
                statusEl.textContent = '🎉 شما برنده شدید! +' + (betAmount * 2) + ' سکه';
                statusEl.className = 'game-status win';
            }
            addCoins(betAmount * 2);
            if (socket) {
                socket.emit('game-over', { winner: userData.displayName });
            }
            return;
        }
        
        if (board.every(cell => cell !== null)) {
            gameActive = false;
            gameOver = true;
            if (statusEl) {
                statusEl.textContent = '🤝 مساوی!';
                statusEl.className = 'game-status draw';
            }
            if (socket) {
                socket.emit('game-over', { winner: 'draw' });
            }
            return;
        }
    }
    
    function updateBoard() {
        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.textContent = board[index] || '';
            cell.className = 'cell';
        });
    }
    
    function checkWin(symbol) {
        const winPatterns = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const pattern of winPatterns) {
            if (pattern.every(index => board[index] === symbol)) {
                pattern.forEach(index => {
                    boardEl.querySelectorAll('.cell')[index].classList.add('win');
                });
                return true;
            }
        }
        return false;
    }
    
    if (socket) {
        socket.off('game-update');
        socket.on('game-update', (data) => {
            if (data.gameType === 'tictactoe' && data.move !== undefined) {
                board[data.move] = data.symbol;
                updateBoard();
                myTurn = true;
                if (statusEl && !gameOver) {
                    statusEl.textContent = '🎯 نوبت شما';
                    statusEl.className = 'game-status playing';
                }
                
                if (checkWin(data.symbol)) {
                    gameActive = false;
                    gameOver = true;
                    if (statusEl) {
                        statusEl.textContent = '😔 شما باختید! -' + betAmount + ' سکه';
                        statusEl.className = 'game-status lose';
                    }
                    removeCoins(betAmount);
                }
                
                if (board.every(cell => cell !== null) && !gameOver) {
                    gameActive = false;
                    gameOver = true;
                    if (statusEl) {
                        statusEl.textContent = '🤝 مساوی!';
                        statusEl.className = 'game-status draw';
                    }
                }
            }
        });
    }
}

// ============================================
// ONLINE ROCK PAPER SCISSORS
// ============================================
function renderOnlineRPS(container, players, betAmount, isFirstPlayer) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    let myChoice = null;
    let opponentChoice = null;
    let gameActive = true;
    let resultShown = false;
    let opponentChoiceReceived = false;
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:10px;">✊ سنگ کاغذ قیچی - 🌐 آنلاین</h2>
        <div style="text-align:center;margin-bottom:5px;color:var(--gold-light);font-size:14px;">
            شرط: ${betAmount} سکه
        </div>
        <div style="text-align:center;margin-bottom:15px;font-size:14px;opacity:0.7;">
            🆚 ${players[0].name} vs ${players[1].name}
        </div>
        <div class="game-status" id="gameStatus">🎯 انتخاب خود را بکنید</div>
        <div class="rps-choices" id="rpsChoices">
            <button class="rps-choice" data-choice="rock">✊</button>
            <button class="rps-choice" data-choice="paper">✋</button>
            <button class="rps-choice" data-choice="scissors">✌️</button>
        </div>
        <div style="text-align:center;margin:10px 0;font-size:18px;" id="rpsDisplay"></div>
        <div class="rps-result" id="rpsResult"></div>
        <div class="game-controls">
            <button class="game-btn secondary" id="quitOnlineGame">🚪 خروج</button>
        </div>
    `;
    
    const choices = document.querySelectorAll('.rps-choice');
    const statusEl = document.getElementById('gameStatus');
    const resultEl = document.getElementById('rpsResult');
    const displayEl = document.getElementById('rpsDisplay');
    
    choices.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    });
    
    choices.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!gameActive || resultShown) return;
            if (myChoice !== null) {
                showNotification('شما قبلاً انتخاب کردید!', 'info');
                return;
            }
            
            myChoice = this.dataset.choice;
            choices.forEach(b => {
                b.style.opacity = '0.5';
                b.style.transform = 'scale(1)';
                b.disabled = true;
            });
            this.style.opacity = '1';
            this.style.transform = 'scale(1.2)';
            
            if (statusEl) {
                statusEl.textContent = '⏳ منتظر انتخاب حریف...';
                statusEl.className = 'game-status waiting';
            }
            
            if (socket) {
                socket.emit('game-move', {
                    gameType: 'rps',
                    choice: myChoice,
                    player: userData.displayName
                });
            }
            
            if (opponentChoiceReceived && opponentChoice) {
                determineWinner(myChoice, opponentChoice);
            }
        });
    });
    
    document.getElementById('quitOnlineGame').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('active');
        if (socket) {
            socket.emit('leave-game');
        }
    });
    
    if (socket) {
        socket.off('game-update');
        socket.on('game-update', (data) => {
            if (data.gameType === 'rps' && data.choice) {
                opponentChoice = data.choice;
                opponentChoiceReceived = true;
                
                if (myChoice !== null) {
                    determineWinner(myChoice, opponentChoice);
                } else {
                    if (statusEl) {
                        statusEl.textContent = '✅ حریف انتخاب کرد! حالا شما انتخاب کنید';
                        statusEl.className = 'game-status playing';
                    }
                    choices.forEach(b => {
                        b.disabled = false;
                        b.style.opacity = '1';
                        b.style.cursor = 'pointer';
                    });
                }
            }
        });
    }
    
    function determineWinner(player, bot) {
        const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
        const names = { rock: 'سنگ', paper: 'کاغذ', scissors: 'قیچی' };
        let result = '';
        let won = false;
        
        if (resultShown) return;
        resultShown = true;
        
        const opponentName = players.find(p => p.name !== userData.displayName)?.name || 'حریف';
        
        if (displayEl) {
            displayEl.innerHTML = `
                <span style="font-size:24px;">شما: ${emojis[player]} (${names[player]})</span>
                <span style="margin:0 15px;font-size:20px;">vs</span>
                <span style="font-size:24px;">${opponentName}: ${emojis[bot]} (${names[bot]})</span>
            `;
        }
        
        if (player === bot) {
            result = '🤝 مساوی!';
            won = false;
        } else if (
            (player === 'rock' && bot === 'scissors') ||
            (player === 'paper' && bot === 'rock') ||
            (player === 'scissors' && bot === 'paper')
        ) {
            result = '🎉 شما برنده شدید! +' + (betAmount * 2) + ' سکه';
            won = true;
            addCoins(betAmount * 2);
        } else {
            result = '😔 شما باختید! -' + betAmount + ' سکه';
            won = false;
            removeCoins(betAmount);
        }
        
        if (statusEl) {
            statusEl.textContent = '🏁 بازی تمام شد!';
            statusEl.className = 'game-status finished';
        }
        if (resultEl) {
            resultEl.textContent = result;
            resultEl.className = `rps-result ${won ? 'win' : (player === bot ? 'draw' : 'lose')}`;
        }
        gameActive = false;
        
        if (socket) {
            socket.emit('game-over', { winner: won ? userData.displayName : opponentName });
        }
    }
}

// ============================================
// ONLINE AIR BATTLE
// ============================================
function renderOnlineAirBattle(container, players, betAmount, isFirstPlayer) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const opponentName = players.find(p => p.name !== userData.displayName)?.name || 'حریف';
    
    let myPos = { x: 50, y: 80 };
    let opponentPos = { x: 50, y: 20 };
    let gameActive = true;
    let myHealth = 5;
    let opponentHealth = 5;
    let canShoot = true;
    let shootCooldown = 800;
    let gameResult = null;
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:10px;">✈️ نبرد هوایی - 🌐 آنلاین</h2>
        <div style="text-align:center;margin-bottom:5px;color:var(--gold-light);font-size:14px;">
            شرط: ${betAmount} سکه | شما: ✈️ | ${opponentName}: 🛩️
        </div>
        <div style="display:flex;justify-content:center;gap:30px;margin-bottom:10px;font-size:14px;">
            <span>❤️ شما: <span id="myHealth">${myHealth}</span></span>
            <span>❤️ ${opponentName}: <span id="opponentHealth">${opponentHealth}</span></span>
        </div>
        <div class="game-status" id="gameStatus">🎮 با جهت‌نما حرکت کن | 🖱️ کلیک چپ شلیک</div>
        <div class="air-battle" id="airBattle" style="cursor:crosshair;position:relative;width:100%;max-width:600px;margin:0 auto;aspect-ratio:4/3;background:radial-gradient(ellipse at center,#1a1a2e,#0a0a0a);border:2px solid var(--glass-border);border-radius:10px;overflow:hidden;">
            <div class="player" id="myPlane" style="position:absolute;font-size:40px;transition:all 0.1s;bottom:20%;left:50%;transform:translateX(-50%);">✈️</div>
            <div class="player" id="opponentPlane" style="position:absolute;font-size:40px;transition:all 0.1s;top:20%;left:50%;transform:translateX(-50%);">🛩️</div>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:16px;font-weight:bold;min-height:30px;" id="gameResultDisplay"></div>
        <div class="game-controls">
            <button class="game-btn secondary" id="quitOnlineGame">🚪 خروج</button>
        </div>
    `;
    
    const myPlane = document.getElementById('myPlane');
    const opponentPlane = document.getElementById('opponentPlane');
    const statusEl = document.getElementById('gameStatus');
    const battleEl = document.getElementById('airBattle');
    const myHealthEl = document.getElementById('myHealth');
    const opponentHealthEl = document.getElementById('opponentHealth');
    const resultDisplay = document.getElementById('gameResultDisplay');
    
    const keyHandler = (e) => {
        if (!gameActive) return;
        const step = 5;
        switch(e.key) {
            case 'ArrowLeft': myPos.x = Math.max(0, myPos.x - step); break;
            case 'ArrowRight': myPos.x = Math.min(100, myPos.x + step); break;
            case 'ArrowUp': myPos.y = Math.max(10, myPos.y - step); break;
            case 'ArrowDown': myPos.y = Math.min(90, myPos.y + step); break;
            default: return;
        }
        updatePositions();
        
        if (socket && gameActive) {
            socket.emit('game-move', {
                gameType: 'airbattle',
                position: myPos,
                playerId: socket.id
            });
        }
    };
    
    document.addEventListener('keydown', keyHandler);
    
    if (battleEl) {
        battleEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameActive && canShoot) {
                myShoot();
            }
        });
        battleEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    document.getElementById('quitOnlineGame').addEventListener('click', () => {
        document.removeEventListener('keydown', keyHandler);
        document.getElementById('gameModal').classList.remove('active');
        if (socket) {
            socket.emit('leave-game');
        }
    });
    
    function updatePositions() {
        if (myPlane) {
            myPlane.style.left = myPos.x + '%';
            myPlane.style.bottom = myPos.y + '%';
            myPlane.style.transform = 'translateX(-50%)';
        }
        if (opponentPlane) {
            opponentPlane.style.left = opponentPos.x + '%';
            opponentPlane.style.top = opponentPos.y + '%';
            opponentPlane.style.transform = 'translateX(-50%)';
        }
    }
    
    function updateHealth() {
        if (myHealthEl) myHealthEl.textContent = myHealth;
        if (opponentHealthEl) opponentHealthEl.textContent = opponentHealth;
    }
    
    function showGameResult(winner) {
        if (gameResult) return;
        gameResult = winner;
        gameActive = false;
        document.removeEventListener('keydown', keyHandler);
        
        if (winner === 'win') {
            const winAmount = betAmount * 2;
            resultDisplay.innerHTML = `
                <span style="color:#4CAF50;font-size:24px;">🎉 شما برنده شدید! +${winAmount} سکه 🪙</span>
            `;
            if (statusEl) {
                statusEl.textContent = '🎉 شما برنده شدید!';
                statusEl.className = 'game-status win';
            }
            addCoins(winAmount);
        } else if (winner === 'lose') {
            resultDisplay.innerHTML = `
                <span style="color:#f44336;font-size:24px;">😔 شما باختید! -${betAmount} سکه 🪙</span>
            `;
            if (statusEl) {
                statusEl.textContent = '😔 شما باختید!';
                statusEl.className = 'game-status lose';
            }
            removeCoins(betAmount);
        } else {
            resultDisplay.innerHTML = `
                <span style="color:#FFC107;font-size:24px;">🤝 مساوی!</span>
            `;
            if (statusEl) {
                statusEl.textContent = '🤝 مساوی!';
                statusEl.className = 'game-status draw';
            }
        }
        
        if (socket) {
            socket.emit('game-over', { winner: winner });
        }
    }
    
    function myShoot() {
        if (!gameActive || !battleEl) return;
        canShoot = false;
        
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.textContent = '💥';
        bullet.style.position = 'absolute';
        bullet.style.left = myPos.x + '%';
        bullet.style.bottom = (myPos.y + 10) + '%';
        bullet.style.fontSize = '24px';
        bullet.style.transform = 'translateX(-50%)';
        bullet.style.transition = 'all 0.6s linear';
        bullet.style.zIndex = '10';
        battleEl.appendChild(bullet);
        
        if (socket) {
            socket.emit('game-move', {
                gameType: 'airbattle',
                shoot: true,
                position: myPos,
                playerId: socket.id
            });
        }
        
        setTimeout(() => {
            bullet.style.bottom = '90%';
        }, 50);
        
        let checkCount = 0;
        const maxChecks = 15;
        const checkInterval = setInterval(() => {
            checkCount++;
            const bulletBottom = parseFloat(bullet.style.bottom) || parseFloat(myPos.y + 10);
            const bulletX = parseFloat(bullet.style.left) || myPos.x;
            
            const hitX = Math.abs(bulletX - opponentPos.x);
            const hitY = Math.abs(bulletBottom - opponentPos.y);
            
            if (hitX < 12 && hitY < 20 && gameActive) {
                clearInterval(checkInterval);
                opponentHealth--;
                updateHealth();
                
                const hitEffect = document.createElement('div');
                hitEffect.textContent = '💥';
                hitEffect.style.position = 'absolute';
                hitEffect.style.left = opponentPos.x + '%';
                hitEffect.style.top = opponentPos.y + '%';
                hitEffect.style.fontSize = '48px';
                hitEffect.style.transform = 'translate(-50%, -50%)';
                hitEffect.style.zIndex = '20';
                hitEffect.style.animation = 'winPulse 0.5s ease-in-out';
                battleEl.appendChild(hitEffect);
                setTimeout(() => hitEffect.remove(), 500);
                
                if (opponentHealth <= 0) {
                    showGameResult('win');
                }
                if (bullet.parentNode) bullet.remove();
                return;
            }
            
            if (checkCount >= maxChecks || parseFloat(bullet.style.bottom) >= 95) {
                clearInterval(checkInterval);
                if (bullet.parentNode) bullet.remove();
            }
        }, 60);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            if (bullet.parentNode) bullet.remove();
        }, 1200);
        
        setTimeout(() => {
            canShoot = true;
        }, shootCooldown);
    }
    
    function opponentShoot(position) {
        if (!gameActive || !battleEl) return;
        
        const shootX = position.x;
        const shootY = position.y;
        
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.textContent = '💥';
        bullet.style.position = 'absolute';
        bullet.style.left = shootX + '%';
        bullet.style.top = (shootY + 10) + '%';
        bullet.style.fontSize = '24px';
        bullet.style.color = '#ff6b6b';
        bullet.style.transform = 'translateX(-50%)';
        bullet.style.transition = 'all 0.6s linear';
        bullet.style.zIndex = '10';
        battleEl.appendChild(bullet);
        
        setTimeout(() => {
            bullet.style.top = '90%';
        }, 50);
        
        let checkCount = 0;
        const maxChecks = 15;
        const checkInterval = setInterval(() => {
            checkCount++;
            const bulletTop = parseFloat(bullet.style.top) || parseFloat(shootY + 10);
            const bulletX = parseFloat(bullet.style.left) || shootX;
            
            const hitX = Math.abs(bulletX - myPos.x);
            const hitY = Math.abs(bulletTop - myPos.y);
            
            if (hitX < 12 && hitY < 20 && gameActive) {
                clearInterval(checkInterval);
                myHealth--;
                updateHealth();
                
                const hitEffect = document.createElement('div');
                hitEffect.textContent = '💥';
                hitEffect.style.position = 'absolute';
                hitEffect.style.left = myPos.x + '%';
                hitEffect.style.bottom = myPos.y + '%';
                hitEffect.style.fontSize = '48px';
                hitEffect.style.transform = 'translate(-50%, 50%)';
                hitEffect.style.zIndex = '20';
                hitEffect.style.animation = 'winPulse 0.5s ease-in-out';
                battleEl.appendChild(hitEffect);
                setTimeout(() => hitEffect.remove(), 500);
                
                if (myHealth <= 0) {
                    showGameResult('lose');
                }
                if (bullet.parentNode) bullet.remove();
                return;
            }
            
            if (checkCount >= maxChecks || parseFloat(bullet.style.top) >= 95) {
                clearInterval(checkInterval);
                if (bullet.parentNode) bullet.remove();
            }
        }, 60);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            if (bullet.parentNode) bullet.remove();
        }, 1200);
    }
    
    if (socket) {
        socket.off('game-update');
        socket.on('game-update', (data) => {
            if (data.gameType === 'airbattle') {
                if (data.position && data.playerId !== socket.id) {
                    opponentPos = data.position;
                    updatePositions();
                }
                if (data.shoot && data.position && data.playerId !== socket.id) {
                    opponentShoot(data.position);
                }
            }
        });
    }
    
    updatePositions();
    updateHealth();
    
    console.log('✈️ Air Battle started!');
    console.log(`You: ${userData.displayName}, Opponent: ${opponentName}`);
}

// ============================================
// GENERATE ROOM CODE
// ============================================
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ============================================
// BOT GAMES
// ============================================

// TIC-TAC-TOE WITH BOT
function renderBotTicTacToe(container, betAmount) {
    let board = Array(9).fill(null);
    let gameActive = true;
    let playerSymbol = 'X';
    let botSymbol = 'O';
    let isPlayerTurn = true;
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:15px;">❌ دوز - 🤖 با ربات</h2>
        <div style="text-align:center;margin-bottom:10px;color:var(--gold-light);">شرط: ${betAmount} سکه</div>
        <div style="text-align:center;margin-bottom:10px;font-size:14px;opacity:0.7;">شما: X | ربات: O</div>
        <div class="game-status" id="gameStatus">نوبت شما</div>
        <div class="game-board tictactoe" id="gameBoard"></div>
        <div class="game-controls">
            <button class="game-btn" id="resetBotGame">🔄 بازی جدید</button>
            <button class="game-btn secondary" id="quitBotGame">🚪 خروج</button>
        </div>
    `;
    
    const boardEl = document.getElementById('gameBoard');
    const statusEl = document.getElementById('gameStatus');
    
    if (!boardEl) return;
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => playerMove(i));
        boardEl.appendChild(cell);
    }
    
    document.getElementById('resetBotGame').addEventListener('click', () => {
        board = Array(9).fill(null);
        gameActive = true;
        isPlayerTurn = true;
        updateBoard();
        if (statusEl) {
            statusEl.textContent = 'نوبت شما';
            statusEl.className = 'game-status playing';
        }
    });
    
    document.getElementById('quitBotGame').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('active');
    });
    
    function playerMove(index) {
        if (!gameActive || !isPlayerTurn || board[index]) return;
        
        board[index] = playerSymbol;
        updateBoard();
        
        if (checkWin(playerSymbol)) {
            gameActive = false;
            if (statusEl) {
                statusEl.textContent = '🎉 شما برنده شدید! +' + (betAmount * 2) + ' سکه';
                statusEl.className = 'game-status win';
            }
            addCoins(betAmount * 2);
            return;
        }
        
        if (board.every(cell => cell !== null)) {
            gameActive = false;
            if (statusEl) {
                statusEl.textContent = '🤝 مساوی!';
                statusEl.className = 'game-status draw';
            }
            return;
        }
        
        isPlayerTurn = false;
        if (statusEl) {
            statusEl.textContent = '🤖 نوبت ربات...';
            statusEl.className = 'game-status waiting';
        }
        
        setTimeout(() => {
            if (!gameActive) return;
            botMove();
        }, 500 + Math.random() * 500);
    }
    
    function botMove() {
        if (!gameActive) return;
        
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = botSymbol;
                if (checkWin(botSymbol)) {
                    updateBoard();
                    gameActive = false;
                    if (statusEl) {
                        statusEl.textContent = '😔 شما باختید! -' + betAmount + ' سکه';
                        statusEl.className = 'game-status lose';
                    }
                    removeCoins(betAmount);
                    return;
                }
                board[i] = null;
            }
        }
        
        for (let i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = playerSymbol;
                if (checkWin(playerSymbol)) {
                    board[i] = botSymbol;
                    updateBoard();
                    isPlayerTurn = true;
                    if (statusEl) {
                        statusEl.textContent = 'نوبت شما';
                        statusEl.className = 'game-status playing';
                    }
                    if (checkWin(botSymbol)) {
                        gameActive = false;
                        if (statusEl) {
                            statusEl.textContent = '😔 شما باختید! -' + betAmount + ' سکه';
                            statusEl.className = 'game-status lose';
                        }
                        removeCoins(betAmount);
                    }
                    return;
                }
                board[i] = null;
            }
        }
        
        const emptyIndices = board.map((cell, i) => cell === null ? i : null).filter(i => i !== null);
        if (emptyIndices.length > 0) {
            const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            board[randomIndex] = botSymbol;
            updateBoard();
            
            if (checkWin(botSymbol)) {
                gameActive = false;
                if (statusEl) {
                    statusEl.textContent = '😔 شما باختید! -' + betAmount + ' سکه';
                    statusEl.className = 'game-status lose';
                }
                removeCoins(betAmount);
                return;
            }
            
            if (board.every(cell => cell !== null)) {
                gameActive = false;
                if (statusEl) {
                    statusEl.textContent = '🤝 مساوی!';
                    statusEl.className = 'game-status draw';
                }
                return;
            }
            
            isPlayerTurn = true;
            if (statusEl) {
                statusEl.textContent = 'نوبت شما';
                statusEl.className = 'game-status playing';
            }
        }
    }
    
    function updateBoard() {
        const cells = boardEl.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.textContent = board[index] || '';
            cell.className = 'cell';
            if (board[index]) {
                cell.style.color = board[index] === playerSymbol ? 'var(--gold)' : '#ff6b6b';
            }
        });
    }
    
    function checkWin(symbol) {
        const winPatterns = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const pattern of winPatterns) {
            if (pattern.every(index => board[index] === symbol)) {
                pattern.forEach(index => {
                    boardEl.querySelectorAll('.cell')[index].classList.add('win');
                });
                return true;
            }
        }
        return false;
    }
}

// ROCK PAPER SCISSORS WITH BOT
function renderBotRPS(container, betAmount) {
    let playerChoice = null;
    let botChoice = null;
    let gameActive = true;
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:15px;">✊ سنگ کاغذ قیچی - 🤖 با ربات</h2>
        <div style="text-align:center;margin-bottom:10px;color:var(--gold-light);">شرط: ${betAmount} سکه</div>
        <div class="game-status" id="gameStatus">انتخاب خود را بکنید</div>
        <div class="rps-choices" id="rpsChoices">
            <button class="rps-choice" data-choice="rock">✊</button>
            <button class="rps-choice" data-choice="paper">✋</button>
            <button class="rps-choice" data-choice="scissors">✌️</button>
        </div>
        <div style="text-align:center;margin:10px 0;font-size:18px;" id="rpsDisplay"></div>
        <div class="rps-result" id="rpsResult"></div>
        <div class="game-controls">
            <button class="game-btn" id="resetRPSGame">🔄 بازی جدید</button>
            <button class="game-btn secondary" id="quitRPSGame">🚪 خروج</button>
        </div>
    `;
    
    const choices = document.querySelectorAll('.rps-choice');
    const statusEl = document.getElementById('gameStatus');
    const resultEl = document.getElementById('rpsResult');
    const displayEl = document.getElementById('rpsDisplay');
    
    choices.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!gameActive) return;
            playerChoice = btn.dataset.choice;
            choices.forEach(b => {
                b.style.opacity = '0.5';
                b.style.transform = 'scale(1)';
            });
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.2)';
            
            if (statusEl) {
                statusEl.textContent = '🤖 در حال فکر کردن...';
                statusEl.className = 'game-status waiting';
            }
            
            setTimeout(() => {
                const choices2 = ['rock', 'paper', 'scissors'];
                botChoice = choices2[Math.floor(Math.random() * choices2.length)];
                determineWinner(playerChoice, botChoice);
            }, 500 + Math.random() * 500);
        });
    });
    
    document.getElementById('resetRPSGame').addEventListener('click', () => {
        gameActive = true;
        playerChoice = null;
        botChoice = null;
        choices.forEach(b => {
            b.style.opacity = '1';
            b.style.transform = 'scale(1)';
        });
        if (statusEl) {
            statusEl.textContent = 'انتخاب خود را بکنید';
            statusEl.className = 'game-status playing';
        }
        if (resultEl) {
            resultEl.textContent = '';
            resultEl.className = 'rps-result';
        }
        if (displayEl) displayEl.textContent = '';
    });
    
    document.getElementById('quitRPSGame').addEventListener('click', () => {
        document.getElementById('gameModal').classList.remove('active');
    });
    
    function determineWinner(player, bot) {
        const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
        const names = { rock: 'سنگ', paper: 'کاغذ', scissors: 'قیچی' };
        let result = '';
        let won = false;
        
        if (displayEl) {
            displayEl.innerHTML = `
                <span style="font-size:24px;">شما: ${emojis[player]} (${names[player]})</span>
                <span style="margin:0 15px;font-size:20px;">vs</span>
                <span style="font-size:24px;">ربات: ${emojis[bot]} (${names[bot]})</span>
            `;
        }
        
        if (player === bot) {
            result = '🤝 مساوی!';
            won = false;
        } else if (
            (player === 'rock' && bot === 'scissors') ||
            (player === 'paper' && bot === 'rock') ||
            (player === 'scissors' && bot === 'paper')
        ) {
            result = '🎉 شما برنده شدید! +' + (betAmount * 2) + ' سکه';
            won = true;
            addCoins(betAmount * 2);
        } else {
            result = '😔 شما باختید! -' + betAmount + ' سکه';
            won = false;
            removeCoins(betAmount);
        }
        
        if (statusEl) {
            statusEl.textContent = 'بازی تمام شد!';
            statusEl.className = 'game-status finished';
        }
        if (resultEl) {
            resultEl.textContent = result;
            resultEl.className = `rps-result ${won ? 'win' : (player === bot ? 'draw' : 'lose')}`;
        }
        gameActive = false;
    }
}

// AIR BATTLE WITH BOT
function renderBotAirBattle(container, betAmount) {
    let playerPos = { x: 50, y: 80 };
    let botPos = { x: 50, y: 20 };
    let gameActive = true;
    let playerHealth = 5;
    let botHealth = 5;
    let canShoot = true;
    let shootCooldown = 800;
    
    container.innerHTML = `
        <h2 style="color:var(--gold);text-align:center;margin-bottom:10px;">✈️ نبرد هوایی - 🤖 با ربات</h2>
        <div style="text-align:center;margin-bottom:5px;color:var(--gold-light);font-size:14px;">شرط: ${betAmount} سکه</div>
        <div style="display:flex;justify-content:center;gap:30px;margin-bottom:10px;font-size:14px;">
            <span>❤️ شما: <span id="playerHealth">${playerHealth}</span></span>
            <span>❤️ ربات: <span id="botHealth">${botHealth}</span></span>
        </div>
        <div class="game-status" id="gameStatus">🎮 با جهت‌نما حرکت کن | 🖱️ کلیک چپ شلیک</div>
        <div class="air-battle" id="airBattle" style="cursor:crosshair;">
            <div class="player player1" id="playerPlane" style="font-size:40px;">✈️</div>
            <div class="player player2" id="botPlane" style="font-size:40px;">🛩️</div>
        </div>
        <div class="game-controls">
            <button class="game-btn" id="resetAirGame">🔄 بازی جدید</button>
            <button class="game-btn secondary" id="quitAirGame">🚪 خروج</button>
        </div>
    `;
    
    const playerEl = document.getElementById('playerPlane');
    const botEl = document.getElementById('botPlane');
    const statusEl = document.getElementById('gameStatus');
    const battleEl = document.getElementById('airBattle');
    const playerHealthEl = document.getElementById('playerHealth');
    const botHealthEl = document.getElementById('botHealth');
    
    const keyHandler = (e) => {
        if (!gameActive) return;
        const step = 5;
        switch(e.key) {
            case 'ArrowLeft': playerPos.x = Math.max(0, playerPos.x - step); break;
            case 'ArrowRight': playerPos.x = Math.min(100, playerPos.x + step); break;
            case 'ArrowUp': playerPos.y = Math.max(10, playerPos.y - step); break;
            case 'ArrowDown': playerPos.y = Math.min(90, playerPos.y + step); break;
            default: return;
        }
        updatePositions();
    };
    
    document.addEventListener('keydown', keyHandler);
    
    if (battleEl) {
        battleEl.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameActive && canShoot) {
                playerShoot();
            }
        });
        battleEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    document.getElementById('resetAirGame').addEventListener('click', () => {
        playerPos = { x: 50, y: 80 };
        botPos = { x: 50, y: 20 };
        playerHealth = 5;
        botHealth = 5;
        gameActive = true;
        canShoot = true;
        updatePositions();
        updateHealth();
        if (statusEl) {
            statusEl.textContent = '🎮 بازی جدید! حرکت کن و شلیک کن';
            statusEl.className = 'game-status playing';
        }
    });
    
    document.getElementById('quitAirGame').addEventListener('click', () => {
        document.removeEventListener('keydown', keyHandler);
        document.getElementById('gameModal').classList.remove('active');
    });
    
    function updatePositions() {
        if (playerEl) {
            playerEl.style.left = playerPos.x + '%';
            playerEl.style.bottom = playerPos.y + '%';
        }
        if (botEl) {
            botEl.style.left = botPos.x + '%';
            botEl.style.top = botPos.y + '%';
        }
    }
    
    function updateHealth() {
        if (playerHealthEl) playerHealthEl.textContent = playerHealth;
        if (botHealthEl) botHealthEl.textContent = botHealth;
    }
    
    function playerShoot() {
        if (!gameActive || !battleEl) return;
        canShoot = false;
        
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.textContent = '💥';
        bullet.style.left = playerPos.x + '%';
        bullet.style.bottom = (playerPos.y + 10) + '%';
        bullet.style.setProperty('--target-y', (playerPos.y + 50) + '%');
        bullet.style.fontSize = '24px';
        battleEl.appendChild(bullet);
        
        if (Math.abs(playerPos.x - botPos.x) < 15 && Math.abs(playerPos.y - botPos.y) < 25) {
            botHealth--;
            updateHealth();
            if (botHealth <= 0) {
                gameActive = false;
                if (statusEl) {
                    statusEl.textContent = '🎉 شما برنده شدید! +' + (betAmount * 2) + ' سکه';
                    statusEl.className = 'game-status win';
                }
                addCoins(betAmount * 2);
                document.removeEventListener('keydown', keyHandler);
                setTimeout(() => bullet.remove(), 500);
                return;
            }
        }
        
        setTimeout(() => bullet.remove(), 800);
        
        setTimeout(() => {
            if (gameActive) {
                botShoot();
            }
        }, 500);
        
        setTimeout(() => {
            canShoot = true;
        }, shootCooldown);
    }
    
    function botShoot() {
        if (!gameActive || !battleEl) return;
        
        const bullet = document.createElement('div');
        bullet.className = 'bullet';
        bullet.textContent = '💥';
        bullet.style.left = botPos.x + '%';
        bullet.style.top = (botPos.y + 10) + '%';
        bullet.style.setProperty('--target-y', (botPos.y + 50) + '%');
        bullet.style.fontSize = '24px';
        bullet.style.color = '#ff6b6b';
        battleEl.appendChild(bullet);
        
        if (Math.abs(playerPos.x - botPos.x) < 15 && Math.abs(playerPos.y - botPos.y) < 25) {
            playerHealth--;
            updateHealth();
            if (playerHealth <= 0) {
                gameActive = false;
                if (statusEl) {
                    statusEl.textContent = '😔 شما باختید! -' + betAmount + ' سکه';
                    statusEl.className = 'game-status lose';
                }
                removeCoins(betAmount);
                document.removeEventListener('keydown', keyHandler);
                setTimeout(() => bullet.remove(), 500);
                return;
            }
        }
        
        setTimeout(() => bullet.remove(), 800);
    }
    
    const botMoveInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(botMoveInterval);
            return;
        }
        const moveX = (Math.random() - 0.5) * 8;
        const moveY = (Math.random() - 0.5) * 8;
        botPos.x = Math.max(0, Math.min(100, botPos.x + moveX));
        botPos.y = Math.max(10, Math.min(90, botPos.y + moveY));
        updatePositions();
    }, 800);
    
    updatePositions();
    updateHealth();
}

// استایل‌های اتاق
const roomStyleTag = document.createElement('style');
roomStyleTag.textContent = `
    @keyframes roomPulse {
        0%, 100% { border-color: var(--gold); box-shadow: 0 0 20px rgba(255,215,0,0.2); }
        50% { border-color: #FFE44D; box-shadow: 0 0 40px rgba(255,215,0,0.4); }
    }
`;
document.head.appendChild(roomStyleTag);

// ============================================
// ADMIN PANEL
// ============================================
function initAdmin() {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (token && userData.role === 'admin' && adminPanelBtn) {
        adminPanelBtn.style.display = 'block';
        
        const newBtn = adminPanelBtn.cloneNode(true);
        adminPanelBtn.parentNode.replaceChild(newBtn, adminPanelBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo('admin');
            
            const glassMenu = document.getElementById('glassMenu');
            if (glassMenu) {
                glassMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    } else {
        if (adminPanelBtn) {
            adminPanelBtn.style.display = 'none';
        }
    }
    
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const sectionId = `section-${this.dataset.tab}`;
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
                loadAdminTab(this.dataset.tab);
            }
        });
    });
    
    const memberForm = document.getElementById('memberForm');
    if (memberForm) {
        memberForm.addEventListener('submit', handleMemberSubmit);
    }
    
    
    const battleForm = document.getElementById('battleForm');
    if (battleForm) {
        battleForm.addEventListener('submit', handleBattleSubmit);
    }
    
    const discountForm = document.getElementById('discountForm');
    if (discountForm) {
        discountForm.addEventListener('submit', handleDiscountSubmit);
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordSubmit);
    }
}

function loadAdminTab(tab) {
    switch(tab) {
        case 'announcements': loadAdminAnnouncements(); break;
        case 'members': loadAdminMembers(); break;
        case 'battles': loadAdminBattles(); break;
        case 'users': loadAdminUsers(); break;
        case 'discounts': loadAdminDiscounts(); break;
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function apiRequest(url, method = 'GET', data = null) {
    try {
        const options = { method, headers: getAuthHeaders() };
        if (data) options.body = JSON.stringify(data);
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'خطا در ارتباط با سرور');
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// ============================================
// ADMIN: ANNOUNCEMENTS
// ============================================
async function loadAdminAnnouncements() {
    const container = document.getElementById('announcementsList');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">در حال بارگذاری</div>';
    try {
        const announcements = await apiRequest('/api/announcements');
        container.innerHTML = '<div class="admin-list">';
        announcements.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.title}</div>
                    <div class="admin-item-sub">📅 ${item.date || 'تاریخ نامشخص'} | ${item.content.substring(0, 50)}${item.content.length > 50 ? '...' : ''}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn delete" data-id="${item.id}" data-type="announcement">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
        container.innerHTML += '</div>';
        
        container.querySelectorAll('.admin-btn.delete[data-type="announcement"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteAnnouncement(id);
            });
        });
    } catch {
        container.innerHTML = '<div class="admin-empty">خطا در بارگذاری اطلاعیه‌ها</div>';
    }
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('announcementTitle')?.value.trim();
    const content = document.getElementById('announcementContent')?.value.trim();
    const date = document.getElementById('announcementDate')?.value.trim() || new Date().toLocaleDateString('fa-IR');
    if (!title || !content) {
        showNotification('عنوان و متن اطلاعیه الزامی است', 'error');
        return;
    }
    try {
        await apiRequest('/api/announcements', 'POST', { title, content, date });
        showNotification('✅ اطلاعیه با موفقیت افزوده شد', 'success');
        const form = document.getElementById('announcementForm');
        if (form) form.reset();
        loadAdminAnnouncements();
    } catch {
        showNotification('❌ خطا در افزودن اطلاعیه', 'error');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('آیا از حذف این اطلاعیه مطمئن هستید؟')) return;
    try {
        await apiRequest(`/api/announcements/${id}`, 'DELETE');
        showNotification('✅ اطلاعیه با موفقیت حذف شد', 'success');
        loadAdminAnnouncements();
    } catch {
        showNotification('❌ خطا در حذف اطلاعیه', 'error');
    }
}

// ============================================
// ADMIN: MEMBERS
// ============================================
async function loadAdminMembers() {
    const container = document.getElementById('adminMembersList');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">در حال بارگذاری</div>';
    try {
        const members = await apiRequest('/api/members');
        if (!members || members.length === 0) {
            container.innerHTML = '<div class="admin-empty">هیچ عضوی ثبت نشده است</div>';
            return;
        }
        container.innerHTML = '<div class="admin-list">';
        members.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.displayName}</div>
                    <div class="admin-item-sub">🏷️ ${item.tag || 'بدون تگ'} | ترتیب: ${item.order || 'نامشخص'}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn edit" data-id="${item.id}" data-name="${item.displayName}" data-tag="${item.tag || ''}" data-order="${item.order || 999}">✏️ ویرایش</button>
                    <button class="admin-btn delete" data-id="${item.id}">🗑️ حذف</button>
                </div>
            `;
            container.appendChild(div);
        });
        container.innerHTML += '</div>';
        
        container.querySelectorAll('.admin-btn.edit').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const currentName = this.dataset.name;
                const currentTag = this.dataset.tag;
                const currentOrder = this.dataset.order;
                editMember(id, currentName, currentTag, currentOrder);
            });
        });
        
        container.querySelectorAll('.admin-btn.delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteMember(id);
            });
        });
    } catch (error) {
        console.error('Error loading admin members:', error);
        container.innerHTML = '<div class="admin-empty">خطا در بارگذاری اعضا</div>';
    }
}

function editMember(id, currentName, currentTag, currentOrder) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    position: relative;">
            <button id="closeEditModal" style="position:absolute;top:10px;left:10px;background:none;border:none;color:var(--gold);font-size:24px;cursor:pointer;">✕</button>
            <h2 style="color:var(--gold);text-align:center;margin-bottom:20px;">✏️ ویرایش عضو</h2>
            <form id="editMemberForm">
                <input type="text" id="editMemberName" value="${currentName}" placeholder="اسم نمایشی" style="width:100%;padding:12px;margin-bottom:15px;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-white);font-family:'Vazir',sans-serif;">
                <input type="text" id="editMemberTag" value="${currentTag}" placeholder="تگ (مثلاً فرمانده)" style="width:100%;padding:12px;margin-bottom:15px;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-white);font-family:'Vazir',sans-serif;">
                <input type="number" id="editMemberOrder" value="${currentOrder}" placeholder="ترتیب نمایش" style="width:100%;padding:12px;margin-bottom:15px;background:rgba(255,255,255,0.05);border:1px solid var(--glass-border);border-radius:8px;color:var(--text-white);font-family:'Vazir',sans-serif;">
                <button type="submit" style="width:100%;padding:12px;background:var(--gold);border:none;border-radius:8px;color:var(--black);font-weight:700;cursor:pointer;font-family:'Vazir',sans-serif;font-size:16px;">💾 ذخیره تغییرات</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeEditModal').addEventListener('click', () => {
        modal.remove();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.getElementById('editMemberForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('editMemberName').value.trim();
        const newTag = document.getElementById('editMemberTag').value.trim();
        const newOrder = parseInt(document.getElementById('editMemberOrder').value.trim()) || 999;
        
        if (!newName) {
            showNotification('اسم نمایشی الزامی است', 'error');
            return;
        }
        
        try {
            await apiRequest(`/api/members/${id}`, 'PUT', { 
                displayName: newName, 
                tag: newTag, 
                order: newOrder 
            });
            showNotification('✅ عضو با موفقیت ویرایش شد', 'success');
            modal.remove();
            loadAdminMembers();
            loadMembers();
        } catch (error) {
            showNotification('❌ خطا در ویرایش عضو', 'error');
        }
    });
}

async function deleteMember(id) {
    if (!confirm('آیا از حذف این عضو مطمئن هستید؟')) return;
    try {
        await apiRequest(`/api/members/${id}`, 'DELETE');
        showNotification('✅ عضو با موفقیت حذف شد', 'success');
        loadAdminMembers();
        loadMembers();
    } catch (error) {
        showNotification('❌ خطا در حذف عضو', 'error');
    }
}

async function handleMemberSubmit(e) {
    e.preventDefault();
    const displayName = document.getElementById('memberName')?.value.trim();
    const tag = document.getElementById('memberTag')?.value.trim();
    const order = document.getElementById('memberOrder')?.value.trim() || '999';
    
    if (!displayName) {
        showNotification('اسم نمایشی الزامی است', 'error');
        return;
    }
    
    try {
        await apiRequest('/api/members', 'POST', { 
            displayName, 
            tag, 
            order: parseInt(order) 
        });
        showNotification('✅ عضو با موفقیت افزوده شد', 'success');
        document.getElementById('memberForm').reset();
        loadAdminMembers();
        loadMembers();
    } catch (error) {
        showNotification('❌ خطا در افزودن عضو', 'error');
    }
}

// ============================================
// ADMIN: BATTLES
// ============================================
async function loadAdminBattles() {
    const container = document.getElementById('battlesList');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">در حال بارگذاری</div>';
    try {
        const battles = await apiRequest('/api/battles');
        container.innerHTML = '<div class="admin-list">';
        battles.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.opponent}</div>
                    <div class="admin-item-sub">📅 ${item.date} | نتیجه: ${item.result} ${item.description ? '| ' + item.description : ''}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn delete" data-id="${item.id}" data-type="battle">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
        container.innerHTML += '</div>';
        
        container.querySelectorAll('.admin-btn.delete[data-type="battle"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteBattle(id);
            });
        });
    } catch {
        container.innerHTML = '<div class="admin-empty">خطا در بارگذاری نتایج جنگ‌ها</div>';
    }
}

async function handleBattleSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('battleDate')?.value.trim();
    const opponent = document.getElementById('battleOpponent')?.value.trim();
    const result = document.getElementById('battleResult')?.value;
    const description = document.getElementById('battleDescription')?.value.trim();
    if (!date || !opponent || !result) {
        showNotification('تاریخ، نام حریف و نتیجه الزامی هستند', 'error');
        return;
    }
    try {
        await apiRequest('/api/battles', 'POST', { date, opponent, result, description });
        showNotification('✅ نتیجه جنگ با موفقیت ثبت شد', 'success');
        const form = document.getElementById('battleForm');
        if (form) form.reset();
        loadAdminBattles();
    } catch {
        showNotification('❌ خطا در ثبت نتیجه جنگ', 'error');
    }
}

async function deleteBattle(id) {
    if (!confirm('آیا از حذف این نتیجه جنگ مطمئن هستید؟')) return;
    try {
        await apiRequest(`/api/battles/${id}`, 'DELETE');
        showNotification('✅ نتیجه جنگ با موفقیت حذف شد', 'success');
        loadAdminBattles();
    } catch {
        showNotification('❌ خطا در حذف نتیجه جنگ', 'error');
    }
}

// ============================================
// ADMIN: USERS
// ============================================
async function loadAdminUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">در حال بارگذاری</div>';
    try {
        const users = await apiRequest('/api/users');
        container.innerHTML = '<div class="admin-list">';
        users.forEach(user => {
            const rank = getCoinRank(user.coins);
            const isMainAdmin = user.username === 'vatan_gap_admin';
            const isAdmin = user.role === 'admin';
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${user.displayName} ${isMainAdmin ? '👑' : ''}</div>
                    <div class="admin-item-sub">🪙 ${user.coins} | رنک: ${rank} | ${isAdmin ? '🔐 ادمین' : '👤 کاربر'} ${user.tag ? '| 🏷️ ' + user.tag : ''}</div>
                </div>
                <div class="admin-item-actions">
                    <div class="user-coins-input">
                        <input type="number" id="coinsInput_${user.id}" placeholder="سکه" min="1">
                        <button class="admin-btn coins" data-id="${user.id}" data-type="coins">➕ سکه</button>
                    </div>
                    ${!isMainAdmin ? `
                        ${isAdmin ? 
                            `<button class="admin-btn demote" data-id="${user.id}" data-type="demote">⬇️ عادی</button>` :
                            `<button class="admin-btn promote" data-id="${user.id}" data-type="promote">⬆️ ادمین</button>`
                        }
                        <button class="admin-btn delete" data-id="${user.id}" data-type="user">🗑️</button>
                    ` : ''}
                </div>
            `;
            container.appendChild(div);
        });
        container.innerHTML += '</div>';
        
        container.querySelectorAll('.admin-btn.coins').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                addCoinsAdmin(id);
            });
        });
        container.querySelectorAll('.admin-btn.promote').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                changeRole(id, 'admin');
            });
        });
        container.querySelectorAll('.admin-btn.demote').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                changeRole(id, 'member');
            });
        });
        container.querySelectorAll('.admin-btn.delete[data-type="user"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteUser(id);
            });
        });
    } catch {
        container.innerHTML = '<div class="admin-empty">خطا در بارگذاری کاربران</div>';
    }
}

async function addCoinsAdmin(userId) {
    const input = document.getElementById(`coinsInput_${userId}`);
    if (!input) return;
    const amount = parseInt(input.value);
    if (!amount || amount < 1) {
        showNotification('لطفاً تعداد سکه معتبر وارد کنید', 'error');
        return;
    }
    try {
        await apiRequest('/api/users/coins', 'POST', { userId, amount });
        showNotification(`✅ ${amount} سکه با موفقیت اضافه شد`, 'success');
        input.value = '';
        loadAdminUsers();
    } catch {
        showNotification('❌ خطا در افزودن سکه', 'error');
    }
}

async function changeRole(userId, newRole) {
    const action = newRole === 'admin' ? 'ادمین' : 'کاربر عادی';
    if (!confirm(`آیا از تغییر نقش این کاربر به ${action} مطمئن هستید؟`)) return;
    try {
        await apiRequest('/api/users/role', 'PUT', { userId, role: newRole });
        showNotification(`✅ نقش کاربر با موفقیت تغییر کرد`, 'success');
        loadAdminUsers();
        
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.id === userId) {
            userData.role = newRole;
            localStorage.setItem('user', JSON.stringify(userData));
            updateUIForLoggedInUser(userData);
            if (newRole === 'admin') {
                showNotification('🔐 شما به ادمین تبدیل شدید! لطفاً صفحه را رفرش کنید.', 'info');
                setTimeout(() => {
                    if (confirm('برای فعال شدن پنل مدیریت، صفحه را رفرش می‌کنید؟')) {
                        location.reload();
                    }
                }, 1500);
            }
        }
    } catch {
        showNotification('❌ خطا در تغییر نقش', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;
    try {
        await apiRequest(`/api/users/${userId}`, 'DELETE');
        showNotification('✅ کاربر با موفقیت حذف شد', 'success');
        loadAdminUsers();
    } catch {
        showNotification('❌ خطا در حذف کاربر', 'error');
    }
}

// ============================================
// ADMIN: DISCOUNTS
// ============================================
async function loadAdminDiscounts() {
    const container = document.getElementById('discountsList');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading">در حال بارگذاری</div>';
    setTimeout(() => {
        const mockDiscounts = [
            { id: '1', code: 'VIP100', amount: 100, used: false },
            { id: '2', code: 'WELCOME50', amount: 50, used: true }
        ];
        container.innerHTML = '<div class="admin-list">';
        mockDiscounts.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.code}</div>
                    <div class="admin-item-sub">${item.amount} سکه | وضعیت: ${item.used ? '✅ استفاده شده' : '🟢 فعال'}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn delete" data-id="${item.id}" data-type="discount">🗑️</button>
                </div>
            `;
            container.appendChild(div);
        });
        container.innerHTML += '</div>';
        
        container.querySelectorAll('.admin-btn.delete[data-type="discount"]').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                deleteDiscount(id);
            });
        });
    }, 500);
}

function handleDiscountSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('discountCode')?.value.trim().toUpperCase();
    const amount = parseInt(document.getElementById('discountAmount')?.value);
    if (!code || !amount) {
        showNotification('کد و مقدار سکه الزامی هستند', 'error');
        return;
    }
    showNotification(`✅ کد تخفیف ${code} با ${amount} سکه ایجاد شد`, 'success');
    const form = document.getElementById('discountForm');
    if (form) form.reset();
    loadAdminDiscounts();
}

function deleteDiscount(id) {
    if (!confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) return;
    showNotification('✅ کد تخفیف با موفقیت حذف شد', 'success');
    loadAdminDiscounts();
}

// ============================================
// ADMIN: PASSWORD
// ============================================
function handlePasswordSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('لطفاً همه فیلدها را پر کنید', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showNotification('رمز جدید باید حداقل ۶ کاراکتر باشد', 'error');
        return;
    }
    if (newPassword !== confirmPassword) {
        showNotification('رمز جدید و تکرار آن مطابقت ندارند', 'error');
        return;
    }
    showNotification('✅ رمز عبور با موفقیت تغییر کرد', 'success');
    const form = document.getElementById('passwordForm');
    if (form) form.reset();
}

// ============================================
// FLOATING BUTTONS
// ============================================
function initFloatingButtons() {
    document.querySelectorAll('.floating-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
    });
}

// ============================================
// SHOP, CHALLENGES, TOURNAMENTS, PROFILE
// ============================================
async function loadShop() {
    const container = document.getElementById('shopContent');
    if (!container) return;
    container.innerHTML = `
        <div class="shop-loading">🏪 فروشگاه به زودی اضافه میشود...</div>
        <div style="text-align:center;padding:20px;opacity:0.7;">
            <p>📌 تگ‌های ویژه</p>
            <p>🖼️ آواتارهای ایموجی</p>
            <p>🎮 ایموجی‌های بازی</p>
        </div>
    `;
}

async function loadChallenges() {
    const container = document.getElementById('challengesContent');
    if (!container) return;
    container.innerHTML = `
        <div class="shop-loading">🏆 چالش‌های روزانه به زودی اضافه میشوند...</div>
        <div style="text-align:center;padding:20px;opacity:0.7;">
            <p>مثال:</p>            
                    <p>📌 امروز ۳ بازی انجام بده = ۲۰ سکه</p>
            <p>📌 ۵ بازی پشت سر هم ببر = ۵۰ سکه</p>
            <p>📌 با ۳ کاربر مختلف بازی کن = ۳۰ سکه</p>
        </div>
    `;
}

async function loadTournaments() {
    const container = document.getElementById('tournamentsContent');
    if (!container) return;
    container.innerHTML = `
        <div class="shop-loading">🏅 مسابقات هفتگی به زودی اضافه میشوند...</div>
        <div style="text-align:center;padding:20px;opacity:0.7;">
                    <p>🥇 نفر اول: ۲۰۰ سکه</p>
            <p>🥈 نفر دوم: ۱۰۰ سکه</p>
            <p>🥉 نفر سوم: ۵۰ سکه</p>
        </div>
    `;
}

async function loadProfile() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.displayName) {
        container.innerHTML = `<div class="shop-loading">👤 لطفاً وارد شوید</div>`;
        return;
    }
    const rank = getCoinRank(userData.coins || 0);
    container.innerHTML = `
        <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:15px;padding:30px;max-width:500px;margin:0 auto;">
            <div style="text-align:center;font-size:64px;margin-bottom:15px;">${userData.avatar || '👤'}</div>
            <h3 style="color:var(--gold);text-align:center;font-size:24px;">${userData.displayName}</h3>
            <div style="text-align:center;opacity:0.7;margin-bottom:20px;">${userData.tag || 'بدون تگ'}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;text-align:center;border:1px solid var(--glass-border);">
                    <div style="font-size:24px;color:var(--gold);font-family:'Orbitron',sans-serif;">${userData.coins || 0}</div>
                    <div style="font-size:12px;opacity:0.7;">🪙 سکه</div>
                </div>
                <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;text-align:center;border:1px solid var(--glass-border);">
                    <div style="font-size:24px;color:var(--gold);">${rank}</div>
                    <div style="font-size:12px;opacity:0.7;">🏅 رنک</div>
                </div>
                <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;text-align:center;border:1px solid var(--glass-border);">
                    <div style="font-size:24px;color:var(--gold);">${userData.role === 'admin' ? '🔐' : '👤'}</div>
                    <div style="font-size:12px;opacity:0.7;">${userData.role === 'admin' ? 'ادمین' : 'کاربر'}</div>
                </div>
                <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;text-align:center;border:1px solid var(--glass-border);">
                    <div style="font-size:24px;color:var(--gold);">${userData.emotes ? userData.emotes.length : 0}</div>
                    <div style="font-size:12px;opacity:0.7;">🎮 ایموجی</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// LUCKY SPIN SYSTEM
// ============================================
const LUCKY_STORAGE_KEY = 'vatan_lucky_spins';

function getLuckyState() {
    try {
        const data = JSON.parse(localStorage.getItem(LUCKY_STORAGE_KEY) || '{}');
        const today = new Date().toDateString();
        if (data.date !== today) {
            return { date: today, spins: 0, totalSpins: data.totalSpins || 0 };
        }
        return data;
    } catch {
        return { date: new Date().toDateString(), spins: 0, totalSpins: 0 };
    }
}

function saveLuckyState(state) {
    localStorage.setItem(LUCKY_STORAGE_KEY, JSON.stringify(state));
}

function loadLuck() {
    const container = document.getElementById('luckContent');
    if (!container) return;
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.displayName) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;opacity:0.7;">
                <div style="font-size:64px;margin-bottom:20px;">👤</div>
                <h3 style="color:var(--gold);">لطفاً وارد شوید</h3>
                <p style="color:var(--text-white);opacity:0.6;">برای استفاده از سیستم شانس ابتدا وارد حساب خود شوید</p>
            </div>
        `;
        return;
    }
    
    const luckyState = getLuckyState();
    const remainingSpins = 3 - luckyState.spins;
    const isEligible = remainingSpins > 0;
    const maxSpins = 3;
    
    container.innerHTML = `
        <div style="max-width:500px;margin:0 auto;">
            <div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:15px;padding:30px;text-align:center;">
                <div style="font-size:80px;margin-bottom:15px;animation:floatIcon 3s ease-in-out infinite;">🎰</div>
                <h3 style="color:var(--gold);font-size:24px;margin-bottom:10px;">چرخ شانس</h3>
                <div style="color:var(--gold-light);opacity:0.7;margin-bottom:20px;font-size:14px;">
                    هر روز ${maxSpins} بار میتونید شانس خود را امتحان کنید
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
                    <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;border:1px solid var(--glass-border);">
                        <div style="font-size:24px;color:var(--gold);font-family:'Orbitron',sans-serif;">${luckyState.spins}</div>
                        <div style="font-size:12px;opacity:0.7;">استفاده شده</div>
                    </div>
                    <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;border:1px solid var(--glass-border);">
                        <div style="font-size:24px;color:var(--gold);font-family:'Orbitron',sans-serif;">${remainingSpins}</div>
                        <div style="font-size:12px;opacity:0.7;">شانس باقی‌مانده</div>
                    </div>
                    <div style="background:rgba(255,215,0,0.05);padding:15px;border-radius:10px;border:1px solid var(--glass-border);">
                        <div style="font-size:24px;color:var(--gold);font-family:'Orbitron',sans-serif;">${luckyState.totalSpins || 0}</div>
                        <div style="font-size:12px;opacity:0.7;">کل چرخش‌ها</div>
                    </div>
                </div>
                
                <div id="spinResult" style="min-height:70px;margin-bottom:15px;"></div>
                
                <button class="game-btn" id="spinBtn" ${!isEligible ? 'disabled' : ''} style="font-size:20px;padding:15px 40px;${!isEligible ? 'opacity:0.5;cursor:not-allowed;' : ''}">
                    ${isEligible ? '🎰 بچرخون!' : '⏳ امروز دیگه شانسی نداری!'}
                </button>
                
                ${!isEligible ? `<div style="margin-top:15px;color:var(--gold-light);opacity:0.7;font-size:14px;">فردا دوباره امتحان کن! 🌅</div>` : ''}
                
                <div style="margin-top:20px;padding:15px;background:rgba(255,215,0,0.05);border-radius:10px;border:1px solid var(--glass-border);">
                    <div style="font-size:14px;opacity:0.7;">🏆 جوایز احتمالی:</div>
                    <div style="display:flex;justify-content:center;gap:15px;margin-top:10px;flex-wrap:wrap;">
                        <span style="color:var(--gold);font-size:13px;">🪙 ۰-۱۰</span>
                        <span style="color:var(--gold);font-size:13px;">🪙 ۱۱-۲۵</span>
                        <span style="color:var(--gold);font-size:13px;">🪙 ۲۶-۴۰</span>
                        <span style="color:var(--gold);font-size:13px;">🪙 ۴۱-۵۰</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const floatStyle = document.createElement('style');
    floatStyle.textContent = `
        @keyframes floatIcon {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        @keyframes spinPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        @keyframes winPulse {
            0% { transform: scale(0.3); opacity: 0; }
            30% { transform: scale(1.3); }
            60% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    if (!document.getElementById('luckyStyles')) {
        floatStyle.id = 'luckyStyles';
        document.head.appendChild(floatStyle);
    }
    
    const spinBtn = document.getElementById('spinBtn');
    const resultDiv = document.getElementById('spinResult');
    
    if (spinBtn && isEligible) {
        spinBtn.addEventListener('click', function() {
            const currentState = getLuckyState();
            if (currentState.spins >= maxSpins) {
                showNotification('⏳ امروز دیگه شانسی نداری!', 'error');
                this.disabled = true;
                this.textContent = '⏳ امروز دیگه شانسی نداری!';
                this.style.opacity = '0.5';
                this.style.cursor = 'not-allowed';
                return;
            }
            
            this.disabled = true;
            this.textContent = '🌀 در حال چرخش...';
            
            let spins = 0;
            const maxSpinsCount = 10 + Math.floor(Math.random() * 10);
            let lastNumber = 0;
            
            const spinInterval = setInterval(() => {
                const randomNum = Math.floor(Math.random() * 51);
                lastNumber = randomNum;
                resultDiv.innerHTML = `
                    <div style="font-size:48px;color:var(--gold);font-family:'Orbitron',sans-serif;animation:spinPulse 0.15s ease-in-out;">
                        🪙 ${randomNum}
                    </div>
                `;
                spins++;
                if (spins >= maxSpinsCount) {
                    clearInterval(spinInterval);
                    
                    const finalAmount = lastNumber;
                    
                    const newState = getLuckyState();
                    newState.spins += 1;
                    newState.totalSpins = (newState.totalSpins || 0) + 1;
                    saveLuckyState(newState);
                    
                    if (finalAmount > 0) {
                        addCoins(finalAmount);
                        resultDiv.innerHTML = `
                            <div style="font-size:52px;color:var(--gold);font-family:'Orbitron',sans-serif;animation:winPulse 0.6s ease-in-out;">
                                🎉 ${finalAmount} 🪙
                            </div>
                            <div style="font-size:16px;color:#4CAF50;margin-top:5px;font-weight:600;">
                                تبریک! ${finalAmount} سکه برنده شدید! 🎊
                            </div>
                        `;
                        resultDiv.style.background = 'radial-gradient(circle, rgba(255,215,0,0.2), transparent)';
                        resultDiv.style.borderRadius = '10px';
                        resultDiv.style.padding = '10px';
                    } else {
                        resultDiv.innerHTML = `
                            <div style="font-size:52px;color:#666;font-family:'Orbitron',sans-serif;">
                                😔 ۰ 🪙
                            </div>
                            <div style="font-size:16px;color:#999;margin-top:5px;">
                                متأسفانه این بار شانس نیاوردید! 😅
                            </div>
                        `;
                        resultDiv.style.background = 'transparent';
                        resultDiv.style.padding = '0';
                    }
                    
                    const updatedState = getLuckyState();
                    const remaining = 3 - updatedState.spins;
                    if (remaining > 0) {
                        this.disabled = false;
                        this.textContent = '🎰 بچرخون!';
                        this.style.opacity = '1';
                        this.style.cursor = 'pointer';
                        showNotification(`${remaining} شانس دیگر دارید!`, 'info');
                    } else {
                        this.disabled = true;
                        this.textContent = '⏳ امروز دیگه شانسی نداری!';
                        this.style.opacity = '0.5';
                        this.style.cursor = 'not-allowed';
                        showNotification('⏳ امروز دیگه شانسی نداری! فردا بیا!', 'info');
                    }
                    
                    setTimeout(() => {
                        loadLuck();
                    }, 1000);
                }
            }, 80);
        });
    }
}

// ============================================
// SHOP SYSTEM
// ============================================

const SHOP_ITEMS = {
    tags: [
        { id: 'tag1', name: 'نوب نیستم', price: 50, order: 1, emoji: '🏷️' },
        { id: 'tag2', name: 'دارم پرو میشم', price: 90, order: 2, emoji: '🏷️' },
        { id: 'tag3', name: 'پرو ام', price: 145, order: 3, emoji: '🏷️' },
        { id: 'tag4', name: 'حرفه ایم', price: 160, order: 4, emoji: '🏷️' },
        { id: 'tag5', name: 'استادم', price: 200, order: 5, emoji: '🏷️' },
        { id: 'tag6', name: 'بقیه شاگردامن', price: 270, order: 6, emoji: '🏷️' },
        { id: 'tag7', name: 'خفن ترینم', price: 350, order: 7, emoji: '🏷️' },
        { id: 'tag8', name: 'جنگ جوی سطح یکم', price: 400, order: 8, emoji: '🏷️' },
        { id: 'tag9', name: 'جنگ جوی سطح دوام', price: 600, order: 9, emoji: '🏷️' },
        { id: 'tag10', name: 'شکست ناپذیرم', price: 1000, order: 10, emoji: '🏷️' }
    ],
    avatars: [
        { id: 'avatar1', name: 'عقاب', price: 50, emoji: '🦅' },
        { id: 'avatar2', name: 'اژدها', price: 80, emoji: '🐉' },
        { id: 'avatar3', name: 'اسپایدر', price: 60, emoji: '🕷️' },
        { id: 'avatar4', name: 'گرگ', price: 40, emoji: '🐺' },
        { id: 'avatar5', name: 'خفاش', price: 30, emoji: '🦇' },
        { id: 'avatar6', name: 'اسب', price: 45, emoji: '🐎' },
        { id: 'avatar7', name: 'عقرب', price: 35, emoji: '🦂' },
        { id: 'avatar8', name: 'شیر ایرانی', price: 100, emoji: '🦁' }
    ],
    emotes: [
        { id: 'emote1', name: 'بمب', price: 20, emoji: '💥' },
        { id: 'emote2', name: 'آتش', price: 15, emoji: '🔥' },
        { id: 'emote3', name: 'برق', price: 25, emoji: '⚡' },
        { id: 'emote4', name: 'ستاره', price: 30, emoji: '💫' },
        { id: 'emote5', name: 'طوفان', price: 40, emoji: '🌪️' },
        { id: 'emote6', name: 'تیر', price: 20, emoji: '🏹' }
    ]
};

function loadShop() {
    const container = document.getElementById('shopContent');
    if (!container) return;
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.displayName) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;opacity:0.7;">
                <div style="font-size:64px;margin-bottom:20px;">👤</div>
                <h3 style="color:var(--gold);">لطفاً وارد شوید</h3>
                <p style="color:var(--text-white);opacity:0.6;">برای خرید از فروشگاه ابتدا وارد حساب خود شوید</p>
            </div>
        `;
        return;
    }
    
    let currentTagIndex = -1;
    for (let i = 0; i < SHOP_ITEMS.tags.length; i++) {
        if (userData.tag === SHOP_ITEMS.tags[i].name) {
            currentTagIndex = i;
            break;
        }
    }
    
    container.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
                <h2 style="color:var(--gold);font-size:24px;">🏪 فروشگاه</h2>
                <div style="display:flex;align-items:center;gap:10px;background:rgba(255,215,0,0.05);padding:8px 20px;border-radius:20px;border:1px solid var(--glass-border);">
                    <span style="font-size:14px;opacity:0.7;">🪙 سکه شما:</span>
                    <span style="font-size:20px;color:var(--gold);font-family:'Orbitron',sans-serif;font-weight:bold;">${userData.coins || 0}</span>
                </div>
            </div>
            
            <div style="display:flex;gap:10px;margin-bottom:25px;flex-wrap:wrap;">
                <button class="shop-tab active" data-tab="tags" style="padding:10px 25px;background:rgba(255,215,0,0.1);border:1px solid var(--gold);border-radius:10px;color:var(--gold);cursor:pointer;font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                    🏷️ تگ‌های ویژه
                </button>
                <button class="shop-tab" data-tab="avatars" style="padding:10px 25px;background:transparent;border:1px solid var(--glass-border);border-radius:10px;color:var(--text-white);cursor:pointer;font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                    🖼️ آواتارها
                </button>
                <button class="shop-tab" data-tab="emotes" style="padding:10px 25px;background:transparent;border:1px solid var(--glass-border);border-radius:10px;color:var(--text-white);cursor:pointer;font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                    🎮 ایموجی‌ها
                </button>
            </div>
            
            <div id="shopTabContent">
                ${renderShopTab('tags', userData, currentTagIndex)}
            </div>
        </div>
    `;
    
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.shop-tab').forEach(t => {
                t.style.background = 'transparent';
                t.style.borderColor = 'var(--glass-border)';
                t.style.color = 'var(--text-white)';
            });
            this.style.background = 'rgba(255,215,0,0.1)';
            this.style.borderColor = 'var(--gold)';
            this.style.color = 'var(--gold)';
            
            const tabName = this.dataset.tab;
            const content = document.getElementById('shopTabContent');
            if (content) {
                content.innerHTML = renderShopTab(tabName, userData, currentTagIndex);
            }
        });
    });
}

function renderShopTab(tab, userData, currentTagIndex) {
    const coins = userData.coins || 0;
    
    if (tab === 'tags') {
        let html = `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:15px;">
                <div style="grid-column:1/-1;padding:15px;background:rgba(255,215,0,0.05);border-radius:10px;border:1px solid var(--glass-border);margin-bottom:10px;">
                    <div style="font-size:14px;opacity:0.7;text-align:center;">
                        📌 تگ‌ها باید به ترتیب خریداری شوند. 
                        ${currentTagIndex >= 0 ? `تگ فعلی شما: <span style="color:var(--gold);font-weight:bold;">"${userData.tag}"</span>` : 'هنوز تگی ندارید!'}
                        ${currentTagIndex < SHOP_ITEMS.tags.length - 1 ? ` | تگ بعدی: <span style="color:var(--gold-light);">"${SHOP_ITEMS.tags[currentTagIndex + 1].name}"</span>` : ' | 🏆 همه تگ‌ها را خریداری کردید!'}
                    </div>
                </div>
        `;
        
        SHOP_ITEMS.tags.forEach((item, index) => {
            const isOwned = userData.tag === item.name;
            const isLocked = currentTagIndex < 0 ? index > 0 : index > currentTagIndex + 1;
            const isNext = currentTagIndex >= 0 ? index === currentTagIndex + 1 : index === 0;
            const canBuy = !isOwned && !isLocked && coins >= item.price;
            
            let statusText = '';
            let statusColor = '';
            let borderColor = 'var(--glass-border)';
            
            if (isOwned) {
                statusText = '✅ خریداری شده';
                statusColor = '#4CAF50';
                borderColor = '#4CAF50';
            } else if (isLocked) {
                statusText = '🔒 قفل شده';
                statusColor = '#666';
                borderColor = '#444';
            } else if (isNext && !isOwned) {
                statusText = '🟢 قابل خرید';
                statusColor = 'var(--gold)';
                borderColor = 'var(--gold)';
            } else {
                statusText = '🔒 قفل شده';
                statusColor = '#666';
                borderColor = '#444';
            }
            
            html += `
                <div style="background:var(--glass-bg);border:2px solid ${borderColor};border-radius:12px;padding:20px;text-align:center;transition:all 0.3s;${isNext && !isOwned ? 'box-shadow:0 0 30px rgba(255,215,0,0.15);' : ''}">
                    <div style="font-size:40px;margin-bottom:10px;">${item.emoji}</div>
                    <div style="font-size:18px;font-weight:600;color:${isOwned ? '#4CAF50' : isLocked ? '#666' : 'var(--text-white)'};">${item.name}</div>
                    <div style="font-size:14px;color:${statusColor};margin:8px 0;">${statusText}</div>
                    <div style="font-size:14px;color:var(--gold-light);font-family:'Orbitron',sans-serif;font-weight:bold;margin-bottom:12px;">
                        🪙 ${item.price} سکه
                    </div>
                    <div style="font-size:12px;opacity:0.5;margin-bottom:12px;">
                        ${isOwned ? '✨ این تگ را دارید' : isLocked ? '🔒 ابتدا تگ قبلی را بخرید' : isNext ? '🛒 آماده خرید' : ''}
                    </div>
                    ${!isOwned && !isLocked ? `
                        <button class="shop-buy-btn" 
                                data-type="tag" 
                                data-id="${item.id}" 
                                ${!canBuy ? 'disabled' : ''}
                                style="width:100%;padding:10px;background:${canBuy ? 'var(--gold)' : '#444'};border:none;border-radius:8px;color:${canBuy ? 'var(--black)' : '#888'};font-weight:700;cursor:${canBuy ? 'pointer' : 'not-allowed'};font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                            ${canBuy ? '💰 خرید' : 'سکه کافی نیست'}
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
        
    } else if (tab === 'avatars') {
        let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:15px;">`;
        
        SHOP_ITEMS.avatars.forEach(item => {
            const isOwned = userData.avatar === item.emoji;
            const canBuy = !isOwned && coins >= item.price;
            
            html += `
                <div style="background:var(--glass-bg);border:1px solid ${isOwned ? '#4CAF50' : 'var(--glass-border)'};border-radius:12px;padding:20px;text-align:center;transition:all 0.3s;">
                    <div style="font-size:56px;margin-bottom:10px;">${item.emoji}</div>
                    <div style="font-size:16px;font-weight:600;color:${isOwned ? '#4CAF50' : 'var(--text-white)'};">${item.name}</div>
                    <div style="font-size:14px;color:${isOwned ? '#4CAF50' : 'var(--gold-light)'};margin:8px 0;">
                        ${isOwned ? '✅ فعال' : `🪙 ${item.price} سکه`}
                    </div>
                    ${!isOwned ? `
                        <button class="shop-buy-btn" 
                                data-type="avatar" 
                                data-id="${item.id}" 
                                ${!canBuy ? 'disabled' : ''}
                                style="width:100%;padding:10px;background:${canBuy ? 'var(--gold)' : '#444'};border:none;border-radius:8px;color:${canBuy ? 'var(--black)' : '#888'};font-weight:700;cursor:${canBuy ? 'pointer' : 'not-allowed'};font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                            ${canBuy ? '💰 خرید' : 'سکه کافی نیست'}
                        </button>
                    ` : `
                        <div style="font-size:12px;color:#4CAF50;margin-top:5px;">✨ آواتار فعال</div>
                    `}
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
        
    } else if (tab === 'emotes') {
        let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:15px;">`;
        
        SHOP_ITEMS.emotes.forEach(item => {
            const isOwned = userData.emotes && userData.emotes.includes(item.emoji);
            const canBuy = !isOwned && coins >= item.price;
            
            html += `
                <div style="background:var(--glass-bg);border:1px solid ${isOwned ? '#4CAF50' : 'var(--glass-border)'};border-radius:12px;padding:20px;text-align:center;transition:all 0.3s;">
                    <div style="font-size:48px;margin-bottom:10px;">${item.emoji}</div>
                    <div style="font-size:16px;font-weight:600;color:${isOwned ? '#4CAF50' : 'var(--text-white)'};">${item.name}</div>
                    <div style="font-size:14px;color:${isOwned ? '#4CAF50' : 'var(--gold-light)'};margin:8px 0;">
                        ${isOwned ? '✅ خریداری شده' : `🪙 ${item.price} سکه`}
                    </div>
                    ${!isOwned ? `
                        <button class="shop-buy-btn" 
                                data-type="emote" 
                                data-id="${item.id}" 
                                ${!canBuy ? 'disabled' : ''}
                                style="width:100%;padding:10px;background:${canBuy ? 'var(--gold)' : '#444'};border:none;border-radius:8px;color:${canBuy ? 'var(--black)' : '#888'};font-weight:700;cursor:${canBuy ? 'pointer' : 'not-allowed'};font-family:'Vazir',sans-serif;font-size:14px;transition:all 0.3s;">
                            ${canBuy ? '💰 خرید' : 'سکه کافی نیست'}
                        </button>
                    ` : `
                        <div style="font-size:12px;color:#4CAF50;margin-top:5px;">✅ در اختیار دارید</div>
                    `}
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
    }
    
    return '<div>خطا در بارگذاری</div>';
}

document.addEventListener('click', async function(e) {
    const buyBtn = e.target.closest('.shop-buy-btn');
    if (!buyBtn) return;
    
    const itemType = buyBtn.dataset.type;
    const itemId = buyBtn.dataset.id;
    
    if (!itemType || !itemId) return;
    
    let item = null;
    let itemList = [];
    
    if (itemType === 'tag') {
        itemList = SHOP_ITEMS.tags;
    } else if (itemType === 'avatar') {
        itemList = SHOP_ITEMS.avatars;
    } else if (itemType === 'emote') {
        itemList = SHOP_ITEMS.emotes;
    }
    
    item = itemList.find(i => i.id === itemId);
    if (!item) {
        showNotification('❌ آیتم یافت نشد', 'error');
        return;
    }
    
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.displayName) {
        showNotification('لطفاً وارد شوید', 'error');
        return;
    }
    
    if ((userData.coins || 0) < item.price) {
        showNotification(`❌ سکه کافی نیست! نیاز به ${item.price} سکه دارید`, 'error');
        return;
    }
    
    if (itemType === 'tag') {
        const currentTagIndex = SHOP_ITEMS.tags.findIndex(t => t.name === userData.tag);
        const itemIndex = SHOP_ITEMS.tags.findIndex(t => t.id === itemId);
        
        if (itemIndex > 0 && currentTagIndex < itemIndex - 1) {
            showNotification(`❌ ابتدا تگ "${SHOP_ITEMS.tags[itemIndex - 1].name}" را بخرید!`, 'error');
            return;
        }
        
        if (userData.tag === item.name) {
            showNotification('❌ شما قبلاً این تگ را دارید!', 'error');
            return;
        }
    }
    
    if (itemType === 'avatar') {
        if (userData.avatar === item.emoji) {
            showNotification('❌ شما قبلاً این آواتار را دارید!', 'error');
            return;
        }
    }
    
    if (itemType === 'emote') {
        if (userData.emotes && userData.emotes.includes(item.emoji)) {
            showNotification('❌ شما قبلاً این ایموجی را دارید!', 'error');
            return;
        }
    }
    
    if (!confirm(`آیا از خرید "${item.name}" به قیمت ${item.price} سکه مطمئن هستید؟`)) {
        return;
    }
    
    try {
        userData.coins = (userData.coins || 0) - item.price;
        
        if (itemType === 'tag') {
            userData.tag = item.name;
        } else if (itemType === 'avatar') {
            userData.avatar = item.emoji;
        } else if (itemType === 'emote') {
            if (!userData.emotes) userData.emotes = [];
            userData.emotes.push(item.emoji);
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        
        const coinAmount = document.getElementById('coinAmount');
        if (coinAmount) coinAmount.textContent = userData.coins;
        
        showNotification(`✅ "${item.name}" با موفقیت خریداری شد! 🎉`, 'success');
        
        loadShop();
        loadMembers();
        if (itemType === 'avatar') {
            loadProfile();
        }
        
    } catch (error) {
        console.error('Purchase error:', error);
        showNotification('❌ خطا در خرید', 'error');
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================
function getUserByDisplayName(displayName) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.displayName === displayName);
}

function getCoinRank(coins) {
    coins = parseInt(coins) || 0;
    if (coins >= 2000) return 'اسطوره';
    if (coins >= 1500) return 'فرمانده';
    if (coins >= 1000) return 'افسر جنگ';
    if (coins >= 700) return 'جنگجوی نخبه';
    if (coins >= 400) return 'جنگجوی ماهر';
    if (coins >= 200) return 'جنگجوی کهنه';
    if (coins >= 100) return 'جنگجوی تازه';
    return 'تازه وارد';
}

// ============================================
// COIN FUNCTIONS
// ============================================
function addCoins(amount) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id) {
        showNotification('❌ خطا: کاربر یافت نشد', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ لطفاً وارد شوید', 'error');
        return;
    }
    
    userData.coins = (userData.coins || 0) + amount;
    localStorage.setItem('user', JSON.stringify(userData));
    
    const coinAmount = document.getElementById('coinAmount');
    if (coinAmount) coinAmount.textContent = userData.coins;
    
    fetch(`${API_URL}/api/users/coins`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            userId: userData.id, 
            amount: amount 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Server error:', data.error);
            userData.coins = (userData.coins || 0) - amount;
            localStorage.setItem('user', JSON.stringify(userData));
            if (coinAmount) coinAmount.textContent = userData.coins;
            showNotification('❌ خطا در ذخیره سکه در سرور', 'error');
        } else {
            if (data.coins !== undefined) {
                userData.coins = data.coins;
                localStorage.setItem('user', JSON.stringify(userData));
                if (coinAmount) coinAmount.textContent = userData.coins;
            }
        }
    })
    .catch(error => {
        console.error('Error adding coins:', error);
        userData.coins = (userData.coins || 0) - amount;
        localStorage.setItem('user', JSON.stringify(userData));
        if (coinAmount) coinAmount.textContent = userData.coins;
        showNotification('❌ خطا در ارتباط با سرور', 'error');
    });
}

function removeCoins(amount) {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id) {
        showNotification('❌ خطا: کاربر یافت نشد', 'error');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('❌ لطفاً وارد شوید', 'error');
        return;
    }
    
    userData.coins = Math.max(0, (userData.coins || 0) - amount);
    localStorage.setItem('user', JSON.stringify(userData));
    
    const coinAmount = document.getElementById('coinAmount');
    if (coinAmount) coinAmount.textContent = userData.coins;
    
    fetch(`${API_URL}/api/users/coins`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            userId: userData.id, 
            amount: -amount 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Server error:', data.error);
            userData.coins = (userData.coins || 0) + amount;
            localStorage.setItem('user', JSON.stringify(userData));
            if (coinAmount) coinAmount.textContent = userData.coins;
            showNotification('❌ خطا در ذخیره سکه در سرور', 'error');
        } else {
            if (data.coins !== undefined) {
                userData.coins = data.coins;
                localStorage.setItem('user', JSON.stringify(userData));
                if (coinAmount) coinAmount.textContent = userData.coins;
                const adminPage = document.getElementById('page-admin');
                if (adminPage && adminPage.classList.contains('active')) {
                    loadAdminUsers();
                }
            }
            showNotification(`-${amount} سکه 🪙`, 'error');
        }
    })
    .catch(error => {
        console.error('Error removing coins:', error);
        userData.coins = (userData.coins || 0) + amount;
        localStorage.setItem('user', JSON.stringify(userData));
        if (coinAmount) coinAmount.textContent = userData.coins;
        showNotification('❌ خطا در ارتباط با سرور', 'error');
    });
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    const colors = {
        success: 'rgba(76, 175, 80, 0.95)',
        error: 'rgba(244, 67, 54, 0.95)',
        info: 'rgba(33, 150, 243, 0.95)'
    };
    notification.style.background = colors[type] || colors.info;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// AUTO REFRESH
// ============================================
setInterval(() => {
    const homePage = document.getElementById('page-home');
    if (homePage && homePage.classList.contains('active')) {
        loadAnnouncements();
        loadMembers();
        loadBattles();
    }
}, 30000);

// ============================================
// CONSOLE LOGO
// ============================================
console.log('%c🏛️ 𓄂𝐕𝐀𝐓𝐀𝐍࿐', 'font-size: 24px; color: #FFD700; font-weight: bold;');
console.log('%cاتحاد ایران باستان', 'font-size: 16px; color: #FFE44D;');
console.log('%cطراحی شده با عشق ❤️', 'font-size: 12px; color: #aaa;');

// ============================================
// CLEANUP
// ============================================
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});