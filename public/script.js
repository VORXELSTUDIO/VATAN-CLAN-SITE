// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    token: localStorage.getItem('token') || null,
    user: null,
    currentPage: 'home',
    announcements: [],
    members: [],
    battles: [],
    users: [],
    currentSlide: 0,
    slideInterval: null,
    socket: null
};

// ============================================
// SPLASH SCREEN (اصلاح شده)
// ============================================
const splash = document.getElementById('splash');
const app = document.getElementById('app');

// مخفی کردن app و نمایش splash
if (app) app.style.display = 'none';
if (splash) splash.style.display = 'flex';

// بعد از 3 ثانیه splash محو بشه و app ظاهر بشه
setTimeout(() => {
    if (splash) {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            splash.style.display = 'none';
            if (app) {
                app.style.display = 'block';
                initApp(); // حالا برنامه شروع بشه
            }
        }, 500);
    }
}, 3000);

// ============================================
// BACKGROUND PARTICLES
// ============================================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const colors = ['#D4AF37', '#E8C872', '#C9A84C', '#B8960F'];
    
    for (let i = 0; i < 35; i++) {
        const particle = document.createElement('div');
        particle.className = 'golden-particle';
        const size = Math.random() * 4 + 2;
        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: ${Math.random() * 0.15 + 0.05};
            animation-duration: ${Math.random() * 20 + 15}s;
            animation-delay: ${Math.random() * 20}s;
        `;
        container.appendChild(particle);
    }
}

// ============================================
// INITIALIZATION
// ============================================
async function initApp() {
    createParticles();
    
    if (state.token) {
        try {
            const decoded = JSON.parse(atob(state.token.split('.')[1]));
            state.user = decoded;
            updateUIForUser();
            // Socket را بعد از احراز هویت تنظیم کنید
            setupSocket();
        } catch {
            state.token = null;
            localStorage.removeItem('token');
        }
    }

    await loadAnnouncements();
    await loadMembers();
    await loadBattles();
    setupEventListeners();
}

// ============================================
// API CALLS
// ============================================
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (state.token) {
        options.headers['Authorization'] = `Bearer ${state.token}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`/api${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'خطا در ارتباط با سرور');
    }

    return data;
}

// ============================================
// LOAD DATA
// ============================================
async function loadAnnouncements() {
    try {
        state.announcements = await apiCall('/announcements');
        renderSlider();
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

async function loadMembers() {
    try {
        state.members = await apiCall('/members');
        renderMembers();
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

async function loadBattles() {
    try {
        state.battles = await apiCall('/battles');
    } catch (error) {
        console.error('Error loading battles:', error);
    }
}

async function loadUsers() {
    try {
        console.log('🔄 Loading users...');
        state.users = await apiCall('/users');
        console.log('✅ Users loaded:', state.users.length);
        renderAdminUsers();
    } catch (error) {
        console.error('❌ Error loading users:', error);
        alert('❌ خطا در بارگذاری کاربران: ' + error.message);
    }
}

// ============================================
// RENDER SLIDER
// ============================================
function renderSlider() {
    const slider = document.getElementById('slider');
    const sliderDots = document.getElementById('sliderDots');
    if (!slider || !sliderDots) return;
    
    if (state.announcements.length === 0) {
        slider.innerHTML = `
            <div class="slide">
                <div class="slide-box" style="text-align: center; color: #aaa;">
                    📭 هنوز اطلاعیه‌ای ثبت نشده است
                </div>
            </div>
        `;
        sliderDots.innerHTML = '';
        return;
    }

    slider.innerHTML = state.announcements.map((item, index) => `
        <div class="slide" data-index="${index}">
            <div class="slide-box">
                <div class="slide-title">${item.title}</div>
                <span class="slide-date">📅 ${item.date}</span>
                <div class="slide-content">${item.content}</div>
            </div>
        </div>
    `).join('');

    sliderDots.innerHTML = state.announcements.map((_, index) => `
        <span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
    `).join('');

    sliderDots.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            goToSlide(index);
            resetSliderTimer();
        });
    });

    state.currentSlide = 0;
    startSliderTimer();
}

function goToSlide(index) {
    const slider = document.getElementById('slider');
    const sliderDots = document.getElementById('sliderDots');
    if (!slider || !sliderDots) return;
    
    if (state.announcements.length === 0) return;
    state.currentSlide = index;
    slider.style.transform = `translateX(${index * 100}%)`;
    sliderDots.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function startSliderTimer() {
    if (state.slideInterval) clearInterval(state.slideInterval);
    if (state.announcements.length <= 1) return;
    
    state.slideInterval = setInterval(() => {
        const next = (state.currentSlide + 1) % state.announcements.length;
        goToSlide(next);
    }, 5000);
}

function resetSliderTimer() {
    if (state.slideInterval) {
        clearInterval(state.slideInterval);
        startSliderTimer();
    }
}

// ============================================
// RENDER MEMBERS
// ============================================
function renderMembers() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    if (state.members.length === 0) {
        membersList.innerHTML = `
            <div class="member-item-vertical" style="justify-content: center; color: #aaa; padding: 12px;">
                هنوز عضوی ثبت نشده است
            </div>
        `;
        return;
    }

    membersList.className = 'members-list-vertical';
    
    membersList.innerHTML = state.members.map(member => `
        <div class="member-item-vertical">
            <span class="member-name-vertical">${member.displayName}</span>
            <span class="member-tag-vertical">${member.tag || 'عضو'}</span>
        </div>
    `).join('');
}

function renderBattles() {
    if (state.battles.length === 0) {
        return '<p style="color: #aaa; text-align: center;">هنوز نتیجه‌ای ثبت نشده است</p>';
    }

    return state.battles.map(battle => {
        const resultClass = battle.result === 'win' ? 'win' : battle.result === 'lose' ? 'lose' : 'draw';
        const resultText = battle.result === 'win' ? '✅ پیروزی' : battle.result === 'lose' ? '❌ شکست' : '⚖️ مساوی';
        
        return `
            <div class="battle-card">
                <div class="battle-header">
                    <span class="battle-opponent">🛡️ ${battle.opponent}</span>
                    <span class="battle-result ${resultClass}">${resultText}</span>
                </div>
                <div style="color: #aaa; font-size: 14px;">📅 ${battle.date}</div>
                ${battle.description ? `<div class="battle-description">${battle.description}</div>` : ''}
            </div>
        `;
    }).join('');
}

function updateUIForUser() {
    const userDisplay = document.getElementById('userDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!userDisplay || !loginBtn || !adminBtn || !logoutBtn) return;
    
    if (state.user) {
        userDisplay.style.display = 'inline';
        let displayName = state.user.displayName || '';
        displayName = displayName.replace(/[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C\u200D\s\w]/g, '');
        userDisplay.textContent = `👤 ${displayName}`;
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        if (state.user.role === 'admin') {
            adminBtn.style.display = 'block';
        } else {
            adminBtn.style.display = 'none';
        }
    } else {
        userDisplay.style.display = 'none';
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    }
}

async function showPage(page, content = '') {
    const lobby = document.querySelector('.lobby');
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) return;
    
    if (lobby) lobby.style.display = 'none';
    pageContainer.style.display = 'block';
    pageContainer.className = 'page-container active';
    
    switch(page) {
        case 'home':
            if (lobby) lobby.style.display = 'block';
            pageContainer.style.display = 'none';
            break;
            
        case 'announcements':
            pageContainer.innerHTML = `
                <h2 class="section-title">📜 تمام اطلاعیه‌ها</h2>
                <div class="slider-container">
                    <div id="slider" class="slider">
                        ${state.announcements.length === 0 ? 
                            `<div class="slide">
                                <div class="slide-box" style="text-align: center; color: #aaa;">
                                    📭 هنوز اطلاعیه‌ای ثبت نشده است
                                </div>
                            </div>` : 
                            state.announcements.map(item => `
                                <div class="slide">
                                    <div class="slide-box">
                                        <div class="slide-title">${item.title}</div>
                                        <span class="slide-date">📅 ${item.date}</span>
                                        <div class="slide-content">${item.content}</div>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                    <div class="slider-dots" id="sliderDots">
                        ${state.announcements.map((_, i) => `
                            <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            if (state.announcements.length > 0) {
                state.currentSlide = 0;
                const slider = document.getElementById('slider');
                const dots = document.getElementById('sliderDots');
                if (slider) slider.style.transform = 'translateX(0)';
                if (dots) {
                    dots.querySelectorAll('.dot').forEach((dot, i) => {
                        dot.addEventListener('click', () => {
                            const index = parseInt(dot.dataset.index);
                            goToSlide(index);
                            resetSliderTimer();
                        });
                    });
                }
                startSliderTimer();
            }
            break;
            
        case 'members':
            pageContainer.innerHTML = `
                <h2 class="section-title">👥 تمام اعضا</h2>
                <div class="members-list-vertical">
                    ${state.members.map(member => `
                        <div class="member-item-vertical">
                            <span class="member-name-vertical">${member.displayName}</span>
                            <span class="member-tag-vertical">${member.tag || 'عضو'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
            
        case 'battles':
            pageContainer.innerHTML = `
                <h2 class="section-title">🏆 نتایج جنگ‌ها</h2>
                ${renderBattles()}
            `;
            break;
            
        case 'chat':
            // بررسی مجدد وضعیت چت از سرور
            if (state.user) {
                try {
                    const users = await apiCall('/users');
                    const currentUser = users.find(u => u._id === state.user.id);
                    if (currentUser) {
                        state.user.canChat = currentUser.canChat;
                        updateUIForUser();
                    }
                } catch (e) {
                    console.error('Error checking chat status:', e);
                }
            }
            
            pageContainer.innerHTML = `
                <h2 class="section-title">💬 چت اتحاد</h2>
                ${state.user ? 
                    (state.user.canChat ? `
                        <div class="chat-box">
                            <div class="chat-messages" id="chatMessages"></div>
                            <div class="chat-input-area">
                                <input type="text" class="chat-input" id="chatInput" placeholder="پیام خود را بنویسید...">
                                <input type="file" id="chatFile" accept="image/*" style="display:none;">
                                <button class="chat-send-btn" id="chatSendBtn">📤 ارسال</button>
                            </div>
                            <div style="margin-top: 10px;">
                                <button onclick="document.getElementById('chatFile').click()" style="background: none; border: 1px solid var(--gold); color: var(--gold); padding: 5px 15px; border-radius: 8px; cursor: pointer;">📷 آپلود عکس</button>
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 50px; color: var(--gold-light);">
                            ⚠️ دسترسی به چت برای شما فعال نیست<br>
                            <span style="font-size: 14px; opacity: 0.7;">لطفاً با ادمین سایت تماس بگیرید</span>
                        </div>
                    `) : `
                    <div style="text-align: center; padding: 50px; color: var(--gold-light);">
                        🔐 برای ورود به چت ابتدا وارد شوید
                    </div>
                `}
            `;
            
            if (state.user && state.user.canChat) {
                setTimeout(() => setupChat(), 100);
            }
            break;
            
        case 'login':
            showAuthPage();
            break;
            
        case 'admin':
            if (state.user && state.user.role === 'admin') {
                showAdminPanel();
            } else {
                pageContainer.innerHTML = '<p style="color: red; text-align: center;">دسترسی غیرمجاز</p>';
            }
            break;
            
        default:
            pageContainer.innerHTML = content;
    }
    
    closeMenuHandler();
}

// ============================================
// AUTH SYSTEM
// ============================================
function showAuthPage() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) return;
    
    pageContainer.innerHTML = `
        <div class="auth-container">
            <h2 class="section-title" style="text-align: center;">🔐 ورود / ثبت‌نام</h2>
            <div id="authForm">
                <form id="loginForm" class="auth-form">
                    <input type="text" id="loginUsername" placeholder="نام کاربری" required>
                    <input type="password" id="loginPassword" placeholder="رمز عبور" required>
                    <button type="submit" class="auth-btn">ورود</button>
                </form>
                <div class="auth-switch">
                    حساب ندارید؟ <a onclick="showRegister()">ثبت‌نام کنید</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const data = await apiCall('/login', 'POST', { username, password });
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('token', data.token);
            updateUIForUser();
            // Socket را دوباره تنظیم کنید
            if (state.socket) {
                state.socket.disconnect();
            }
            setupSocket();
            showPage('home');
            alert('✅ ورود موفق!');
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });
}

function showRegister() {
    const authForm = document.getElementById('authForm');
    if (!authForm) return;
    
    authForm.innerHTML = `
        <form id="registerForm" class="auth-form">
            <input type="text" id="regDisplayName" placeholder="اسم نمایشی (فقط انگلیسی)" required pattern="[A-Za-z\\s]+" title="فقط حروف انگلیسی مجاز است">
            <input type="text" id="regUsername" placeholder="نام کاربری" required>
            <input type="password" id="regPassword" placeholder="رمز عبور" required>
            <input type="password" id="regConfirmPassword" placeholder="تکرار رمز" required>
            <button type="submit" class="auth-btn">ثبت‌نام</button>
        </form>
        <div class="auth-switch">
            قبلاً ثبت‌نام کردید؟ <a onclick="showAuthPage()">ورود</a>
        </div>
    `;

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('regDisplayName').value.trim();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;

        const englishPattern = /^[A-Za-z\s]+$/;
        if (!englishPattern.test(displayName)) {
            alert('❌ اسم نمایشی باید فقط با حروف انگلیسی باشد!');
            return;
        }

        if (displayName.length < 2) {
            alert('❌ اسم نمایشی باید حداقل ۲ حرف باشد!');
            return;
        }

        if (password !== confirm) {
            alert('❌ رمزها مطابقت ندارند!');
            return;
        }

        if (password.length < 4) {
            alert('❌ رمز عبور باید حداقل ۴ کاراکتر باشد!');
            return;
        }

        try {
            await apiCall('/register', 'POST', { displayName, username, password });
            alert('✅ ثبت‌نام موفق! حالا وارد شوید.');
            showAuthPage();
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });
}

// ============================================
// CHAT SYSTEM (نسخه نهایی با مدیریت تاخیر)
// ============================================
let isSocketReady = false;
let pendingMessages = [];

function setupSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO not loaded');
        return;
    }
    
    // اگر سوکت قبلی وجود دارد، آن را ببندید
    if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
    }
    
    isSocketReady = false;
    
    state.socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });
    
    // ============================================
    // رویدادهای Socket
    // ============================================
    
    state.socket.on('connect', () => {
        console.log('✅ Socket connected:', state.socket.id);
        isSocketReady = true;
        
        // ثبت شناسه کاربر
        if (state.user && state.user.id) {
            state.socket.emit('registerUser', state.user.id);
            console.log('📡 User registered with socket:', state.user.id);
        }
        
        // ارسال پیام‌های معلق
        if (pendingMessages.length > 0) {
            console.log(`📤 Sending ${pendingMessages.length} pending messages`);
            pendingMessages.forEach(msg => {
                state.socket.emit('sendMessage', msg);
            });
            pendingMessages = [];
        }
    });
    
    state.socket.on('disconnect', () => {
        console.log('🔴 Socket disconnected');
        isSocketReady = false;
    });
    
    state.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        isSocketReady = false;
    });

    // ============================================
    // دریافت تاریخچه چت
    // ============================================
    state.socket.on('chatHistory', (messages) => {
        console.log('📨 Chat history received:', messages?.length || 0, 'messages');
        
        const container = document.getElementById('chatMessages');
        if (!container) {
            console.warn('⚠️ chatMessages container not found');
            return;
        }
        
        if (!messages || messages.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #666; padding: 20px;">
                🕊️ هنوز پیامی در چت وجود ندارد
                <br><span style="font-size: 12px; opacity: 0.5;">اولین پیام را شما بفرستید!</span>
            </div>`;
            return;
        }
        
        // نمایش پیام‌ها با ترتیب زمانی صحیح
        const sortedMessages = [...messages].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        container.innerHTML = sortedMessages.map(msg => renderMessage(msg)).join('');
        container.scrollTop = container.scrollHeight;
        console.log('✅ Chat history rendered, showing', sortedMessages.length, 'messages');
    });

    // ============================================
    // دریافت پیام جدید
    // ============================================
    state.socket.on('newMessage', (message) => {
        console.log('📩 New message received from:', message.sender);
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // حذف پیام "هنوز پیامی وجود ندارد" اگر وجود دارد
        if (container.innerHTML.includes('هنوز پیامی در چت وجود ندارد') || 
            container.innerHTML.includes('🕊️ هنوز پیامی در چت وجود ندارد')) {
            container.innerHTML = '';
        }
        
        container.innerHTML += renderMessage(message);
        container.scrollTop = container.scrollHeight;
    });

    // ============================================
    // رویداد خروج اجباری
    // ============================================
    state.socket.on('forceLogout', (data) => {
        console.log('💥 Force logout received:', data);
        
        alert(`⚠️ ${data.message || 'حساب کاربری شما توسط ادمین حذف شده است'}`);
        
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        updateUIForUser();
        showPage('home');
        
        if (state.socket) {
            state.socket.disconnect();
            state.socket = null;
        }
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    });

    state.socket.on('userDeleted', (data) => {
        console.log(`🗑️ User deleted: ${data.username} (${data.userId})`);
        if (state.currentPage === 'admin') {
            loadUsers();
        }
    });
}

// ============================================
// ارسال پیام با مدیریت اتصال
// ============================================
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    const messageData = {
        sender: state.user?.displayName || 'ناشناس',
        text: text,
        imageUrl: ''
    };

    // اگر Socket آماده نیست، پیام را در صف قرار بده
    if (!isSocketReady || !state.socket || !state.socket.connected) {
        console.warn('⚠️ Socket not ready, message queued');
        pendingMessages.push(messageData);
        alert('⏳ در حال اتصال به سرور... پیام شما به زودی ارسال خواهد شد');
        input.value = '';
        return;
    }

    // ارسال پیام
    state.socket.emit('sendMessage', messageData);
    console.log('📤 Message sent:', text);
    input.value = '';
}

// ============================================
// تنظیم چت (با تاخیر برای اطمینان از اتصال)
// ============================================
function setupChat() {
    console.log('🔄 Setting up chat...');
    
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const fileInput = document.getElementById('chatFile');

    if (!input || !sendBtn) {
        console.warn('⚠️ Chat elements not found');
        return;
    }

    // حذف event listenerهای قبلی (برای جلوگیری از تکراری شدن)
    const newSendBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newSendBtn.addEventListener('click', sendChatMessage);
    newInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // اگر Socket آماده نیست، درخواست تاریخچه مجدد
    if (!isSocketReady || !state.socket || !state.socket.connected) {
        console.log('⏳ Waiting for socket connection...');
        
        // تلاش مجدد برای دریافت تاریخچه بعد از 2 ثانیه
        setTimeout(() => {
            if (state.socket && state.socket.connected) {
                console.log('🔄 Requesting chat history again...');
                state.socket.emit('requestHistory');
            } else {
                console.warn('⚠️ Socket still not connected after 2 seconds');
            }
        }, 2000);
    }

    // مدیریت آپلود عکس
    if (fileInput) {
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        
        newFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const imageUrl = event.target.result;
                    const messageData = {
                        sender: state.user?.displayName || 'ناشناس',
                        text: '',
                        imageUrl: imageUrl
                    };
                    
                    if (!isSocketReady || !state.socket || !state.socket.connected) {
                        pendingMessages.push(messageData);
                        alert('⏳ در حال اتصال به سرور... عکس شما به زودی ارسال خواهد شد');
                    } else {
                        state.socket.emit('sendMessage', messageData);
                    }
                } catch (error) {
                    alert('❌ خطا در آپلود عکس');
                }
            };
            reader.readAsDataURL(file);
            newFileInput.value = '';
        });
    }
    
    console.log('✅ Chat setup complete');
}
// ============================================
// ADMIN PANEL
// ============================================
function showAdminPanel() {
    const pageContainer = document.getElementById('pageContainer');
    if (!pageContainer) return;
    
    state.currentPage = 'admin';
    
    pageContainer.innerHTML = `
        <h2 class="section-title">⚙️ پنل مدیریت</h2>
        <div class="admin-panel">
            <div class="admin-section">
                <h3>🔑 تغییر رمز ادمین</h3>
                <form id="changePasswordForm" class="admin-form">
                    <input type="password" id="oldPass" placeholder="رمز فعلی" required>
                    <input type="password" id="newPass" placeholder="رمز جدید" required>
                    <input type="password" id="confirmPass" placeholder="تکرار رمز جدید" required>
                    <button type="submit" class="admin-submit">🔄 تغییر رمز</button>
                </form>
            </div>

            <div class="admin-section">
                <h3>📜 مدیریت اطلاعیه‌ها</h3>
                <form id="addAnnouncement" class="admin-form">
                    <input type="text" id="annTitle" placeholder="عنوان اطلاعیه" required>
                    <input type="text" id="annDate" placeholder="تاریخ (مثلاً ۱۴۰۴/۰۵/۰۱)" required>
                    <textarea id="annContent" placeholder="متن اطلاعیه" required></textarea>
                    <button type="submit" class="admin-submit">➕ افزودن اطلاعیه</button>
                </form>
                <div id="announcementsList" class="admin-list" style="margin-top: 20px;"></div>
            </div>

            <div class="admin-section">
                <h3>👥 مدیریت اعضا</h3>
                <form id="addMember" class="admin-form">
                    <input type="text" id="memberName" placeholder="اسم عضو" required>
                    <input type="text" id="memberTag" placeholder="تگ/رنک">
                    <input type="number" id="memberOrder" placeholder="ترتیب نمایش (عدد)">
                    <button type="submit" class="admin-submit">➕ افزودن عضو</button>
                </form>
                <div id="membersListAdmin" class="admin-list" style="margin-top: 20px;"></div>
            </div>

            <div class="admin-section">
                <h3>🏆 ثبت نتیجه جنگ</h3>
                <form id="addBattle" class="admin-form">
                    <input type="text" id="battleDate" placeholder="تاریخ (مثلاً ۱۴۰۴/۰۵/۰۱)" required>
                    <input type="text" id="battleOpponent" placeholder="نام اتحاد حریف" required>
                    <select id="battleResult" required>
                        <option value="win">پیروزی</option>
                        <option value="lose">شکست</option>
                        <option value="draw">مساوی</option>
                    </select>
                    <textarea id="battleDesc" placeholder="توضیحات (اختیاری)"></textarea>
                    <button type="submit" class="admin-submit">➕ ثبت نتیجه</button>
                </form>
                <div id="battlesList" class="admin-list" style="margin-top: 20px;"></div>
            </div>

            <div class="admin-section">
                <h3>👤 مدیریت کاربران</h3>
                <div id="usersList" class="admin-list"></div>
            </div>
        </div>
    `;

    loadAdminData();

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('oldPass').value;
        const newPassword = document.getElementById('newPass').value;
        const confirm = document.getElementById('confirmPass').value;
        
        if (newPassword !== confirm) {
            alert('❌ رمزها مطابقت ندارند!');
            return;
        }
        
        try {
            await apiCall('/change-password', 'POST', { oldPassword, newPassword });
            alert('✅ رمز با موفقیت تغییر کرد!');
            document.getElementById('changePasswordForm').reset();
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });

    document.getElementById('addAnnouncement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('annTitle').value;
        const date = document.getElementById('annDate').value;
        const content = document.getElementById('annContent').value;

        try {
            await apiCall('/announcements', 'POST', { title, content, date });
            await loadAnnouncements();
            loadAdminData();
            document.getElementById('addAnnouncement').reset();
            alert('✅ اطلاعیه اضافه شد');
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });

    document.getElementById('addMember').addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('memberName').value;
        const tag = document.getElementById('memberTag').value;
        const order = parseInt(document.getElementById('memberOrder').value);

        try {
            await apiCall('/members', 'POST', { displayName, tag, order });
            await loadMembers();
            loadAdminData();
            document.getElementById('addMember').reset();
            alert('✅ عضو اضافه شد');
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });

    document.getElementById('addBattle').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('battleDate').value;
        const opponent = document.getElementById('battleOpponent').value;
        const result = document.getElementById('battleResult').value;
        const description = document.getElementById('battleDesc').value;

        try {
            await apiCall('/battles', 'POST', { date, opponent, result, description });
            await loadBattles();
            loadAdminData();
            document.getElementById('addBattle').reset();
            alert('✅ نتیجه ثبت شد');
        } catch (error) {
            alert('❌ ' + error.message);
        }
    });
}

async function loadAdminData() {
    if (state.user && state.user.role === 'admin') {
        await loadUsers();
    }

    const annList = document.getElementById('announcementsList');
    if (annList) {
        annList.innerHTML = state.announcements.map(item => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <strong>${item.title}</strong>
                    <span>${item.date}</span>
                </div>
                <div class="admin-item-actions">
                    <button onclick="deleteAnnouncement('${item._id}')" class="admin-btn admin-btn-danger">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    const memList = document.getElementById('membersListAdmin');
    if (memList) {
        memList.innerHTML = state.members.map(item => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <strong>${item.displayName}</strong>
                    <span>${item.tag || 'عضو'}</span>
                </div>
                <div class="admin-item-actions">
                    <button onclick="deleteMember('${item._id}')" class="admin-btn admin-btn-danger">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    const battleList = document.getElementById('battlesList');
    if (battleList) {
        battleList.innerHTML = state.battles.map(item => `
            <div class="admin-item">
                <div class="admin-item-info">
                    <strong>${item.opponent}</strong>
                    <span>${item.date} - ${item.result}</span>
                </div>
                <div class="admin-item-actions">
                    <button onclick="deleteBattle('${item._id}')" class="admin-btn admin-btn-danger">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

// ============================================
// RENDER ADMIN USERS (با Event Listeners)
// ============================================
function renderAdminUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = state.users.map(user => {
        let displayName = user.displayName || '';
        displayName = displayName.replace(/[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C\u200D\s\w]/g, '');
        
        const isMainAdmin = user.username === 'admin' || user.username === 'vatan_gap_admin';
        const canChat = user.canChat || false;
        
        return `
        <div class="admin-item" data-userid="${user._id}">
            <div class="admin-item-info">
                <strong>${displayName}</strong>
                <span>@${user.username}</span>
                <span style="opacity: 0.5; margin-right: 10px;">${user.role === 'admin' ? '👑 ادمین' : '👤 عضو'}</span>
                <span style="color: ${canChat ? '#27ae60' : '#e74c3c'}; font-size: 11px; margin-right: 5px;">
                    ${canChat ? '🟢 چت فعال' : '🔴 چت غیرفعال'}
                </span>
                ${isMainAdmin ? '<span style="color: var(--gold); font-size: 11px; margin-right: 10px;">⭐ مدیر سایت</span>' : ''}
            </div>
            <div class="admin-item-actions">
                ${user.role !== 'admin' ? `
                    <button class="admin-btn admin-btn-gold make-admin-btn" data-id="${user._id}">
                        👑 ارتقا به ادمین
                    </button>
                ` : `
                    <span style="color: var(--gold); font-size: 12px;">✅ ادمین</span>
                `}
                <button class="admin-btn ${canChat ? 'admin-btn-success' : 'admin-btn-warning'} toggle-chat-btn" data-id="${user._id}" data-status="${!canChat}">
                    ${canChat ? '✅ چت فعال' : '⛔ چت غیرفعال'}
                </button>
                ${!isMainAdmin ? `
                    <button class="admin-btn admin-btn-danger delete-user-btn" data-id="${user._id}">
                        🗑️ حذف
                    </button>
                ` : ''}
            </div>
        </div>
    `}).join('');

    // اضافه کردن Event Listeners با استفاده از Event Delegation
    usersList.querySelectorAll('.make-admin-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.id;
            console.log('🟢 Make Admin clicked for:', userId);
            makeAdmin(userId);
        });
    });

    usersList.querySelectorAll('.toggle-chat-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.id;
            const newStatus = this.dataset.status === 'true';
            console.log('🟢 Toggle Chat clicked for:', userId, 'new status:', newStatus);
            toggleChatAccess(userId, newStatus);
        });
    });

    usersList.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.id;
            console.log('🟢 Delete User clicked for:', userId);
            deleteUser(userId);
        });
    });
}

// ============================================
// ADMIN ACTIONS (نسخه نهایی با لاگ کامل)
// ============================================
async function deleteAnnouncement(id) {
    if (!confirm('حذف شود؟')) return;
    try {
        await apiCall(`/announcements/${id}`, 'DELETE');
        await loadAnnouncements();
        loadAdminData();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function deleteMember(id) {
    if (!confirm('حذف شود؟')) return;
    try {
        await apiCall(`/members/${id}`, 'DELETE');
        await loadMembers();
        loadAdminData();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function deleteBattle(id) {
    if (!confirm('حذف شود؟')) return;
    try {
        await apiCall(`/battles/${id}`, 'DELETE');
        await loadBattles();
        loadAdminData();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

// ============================================
// TOGGLE CHAT ACCESS (نسخه نهایی با لاگ کامل)
// ============================================
async function toggleChatAccess(userId, newStatus) {
    console.log('🔥 toggleChatAccess called with userId:', userId, 'newStatus:', newStatus);
    
    try {
        console.log('📤 Sending request to server...');
        const data = await apiCall(`/users/${userId}/chat`, 'PUT', { canChat: newStatus });
        console.log('📥 Response:', data);
        
        alert(`✅ دسترسی چت ${newStatus ? 'فعال' : 'غیرفعال'} شد!`);
        
        console.log('🔄 Reloading users...');
        await loadUsers();
        renderAdminUsers();
        
        if (state.user && state.user.id === userId) {
            console.log('🔄 Updating current user chat status...');
            state.user.canChat = newStatus;
            updateUIForUser();
        }
    } catch (error) {
        console.error('❌ Error in toggleChatAccess:', error);
        alert('❌ ' + error.message);
    }
}

// ============================================
// MAKE USER ADMIN (نسخه نهایی با لاگ کامل)
// ============================================
async function makeAdmin(userId) {
    console.log('🔥 makeAdmin called with userId:', userId);
    
    if (!confirm('آیا مطمئن هستید که این کاربر را به ادمین ارتقا دهید؟')) {
        console.log('❌ User cancelled');
        return;
    }
    
    try {
        console.log('📤 Sending request to server...');
        const data = await apiCall(`/users/${userId}/make-admin`, 'PUT');
        console.log('📥 Response:', data);
        
        alert('✅ کاربر با موفقیت به ادمین ارتقا یافت!');
        
        console.log('🔄 Reloading users...');
        await loadUsers();
        renderAdminUsers();
        
        if (state.user && state.user.id === userId) {
            console.log('🔄 Updating current user role...');
            state.user.role = 'admin';
            updateUIForUser();
            alert('⚠️ برای اعمال کامل تغییرات، لطفاً خارج شده و دوباره وارد شوید!');
        }
    } catch (error) {
        console.error('❌ Error in makeAdmin:', error);
        alert('❌ ' + error.message);
    }
}

// ============================================
// DELETE USER (نسخه نهایی با قطع اتصال Socket)
// ============================================
async function deleteUser(userId) {
    console.log('🔥 deleteUser called with userId:', userId);
    
    if (!confirm('آیا مطمئن هستید که این کاربر را حذف کنید؟')) {
        console.log('❌ User cancelled');
        return;
    }
    
    // اگر کاربر خودش را حذف می‌کند (به جز ادمین اصلی)
    if (state.user && state.user.id === userId) {
        if (!confirm('⚠️ شما در حال حذف حساب کاربری خود هستید! ادامه می‌دهید؟')) {
            return;
        }
    }
    
    try {
        console.log('📤 Sending request to server...');
        const data = await apiCall(`/users/${userId}`, 'DELETE');
        console.log('📥 Response:', data);
        
        alert('✅ کاربر با موفقیت حذف شد!');
        
        // اگر کاربر خودش را حذف کرده، او را لاگ‌اوت کنید
        if (state.user && state.user.id === userId) {
            console.log('🔄 User deleted themselves, logging out...');
            state.token = null;
            state.user = null;
            localStorage.removeItem('token');
            updateUIForUser();
            showPage('home');
            
            if (state.socket) {
                state.socket.disconnect();
                state.socket = null;
            }
            
            alert('⚠️ حساب کاربری شما حذف شد!');
            setTimeout(() => {
                location.reload();
            }, 1000);
            return;
        }
        
        console.log('🔄 Reloading users...');
        await loadUsers();
        renderAdminUsers();
    } catch (error) {
        console.error('❌ Error in deleteUser:', error);
        alert('❌ ' + error.message);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    const menuBtn = document.getElementById('menuBtn');
    const closeMenu = document.getElementById('closeMenu');
    const glassMenu = document.getElementById('glassMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (glassMenu) {
                glassMenu.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    }

    if (closeMenu) {
        closeMenu.addEventListener('click', closeMenuHandler);
    }
    
    if (glassMenu) {
        glassMenu.addEventListener('click', (e) => {
            if (e.target === glassMenu) closeMenuHandler();
        });
    }

    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page === 'login') {
                showPage('login');
            } else {
                state.currentPage = page;
                showPage(page);
            }
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.token = null;
            state.user = null;
            localStorage.removeItem('token');
            updateUIForUser();
            showPage('home');
            alert('🚪 خارج شدید');
            closeMenuHandler();
        });
    }
}

function closeMenuHandler() {
    const glassMenu = document.getElementById('glassMenu');
    if (glassMenu) glassMenu.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ============================================
// EXPOSE FUNCTIONS FOR HTML
// ============================================
window.showRegister = showRegister;
window.showAuthPage = showAuthPage;
window.showPage = showPage;
window.deleteAnnouncement = deleteAnnouncement;
window.deleteMember = deleteMember;
window.deleteBattle = deleteBattle;
window.toggleChatAccess = toggleChatAccess;
window.makeAdmin = makeAdmin;
window.deleteUser = deleteUser;

console.log('🏛️ 𓄂𝐕𝐀𝐓𝐀𝐍࿐ - سایت اتحاد آماده است!');