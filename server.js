// ============================================
// 𓄂𝐕𝐀𝐓𝐀𝐍࿐ - Main Server
// ============================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// ============================================
// Configuration
// ============================================

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ["GET", "POST"]
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vatan_secret_key_2026';
const DATA_DIR = path.join(__dirname, 'server/data');
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ============================================
// Middleware
// ============================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.socket.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 5 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
    message: { error: 'درخواست زیاد! لطفاً ۵ دقیقه دیگر تلاش کنید.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ============================================
// Database Functions
// ============================================

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('❌ Error creating data directory:', error);
        throw error;
    }
}

async function readJSON(filename) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error(`❌ Error reading ${filename}:`, error);
        throw error;
    }
}

async function writeJSON(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`❌ Error writing ${filename}:`, error);
        throw error;
    }
}

// ============================================
// Database Models
// ============================================

async function getUsers() { return await readJSON('users.json'); }
async function saveUsers(users) { await writeJSON('users.json', users); }

async function getAnnouncements() { return await readJSON('announcements.json'); }
async function saveAnnouncements(announcements) { await writeJSON('announcements.json', announcements); }

async function getMembers() { return await readJSON('members.json'); }
async function saveMembers(members) { await writeJSON('members.json', members); }

async function getBattles() { return await readJSON('battles.json'); }
async function saveBattles(battles) { await writeJSON('battles.json', battles); }

async function getShopItems() { return await readJSON('shopItems.json'); }
async function saveShopItems(items) { await writeJSON('shopItems.json', items); }

async function getChallenges() { return await readJSON('challenges.json'); }
async function saveChallenges(challenges) { await writeJSON('challenges.json', challenges); }

async function getTournaments() { return await readJSON('tournaments.json'); }
async function saveTournaments(tournaments) { await writeJSON('tournaments.json', tournaments); }

async function getDiscountCodes() { return await readJSON('discountCodes.json'); }
async function saveDiscountCodes(codes) { await writeJSON('discountCodes.json', codes); }

async function getGameHistory() { return await readJSON('gameHistory.json'); }
async function saveGameHistory(history) { await writeJSON('gameHistory.json', history); }

// ============================================
// Utility Functions
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
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
// Authentication Middleware
// ============================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'توکن احراز هویت یافت نشد' });
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'توکن منقضی شده است' });
        }
        return res.status(403).json({ error: 'توکن نامعتبر است' });
    }
}

function isAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'دسترسی محدود به ادمین' });
    }
    next();
}

// ============================================
// API Routes
// ============================================

// ===== Auth Routes =====

app.post('/api/register', async (req, res) => {
    try {
        const { displayName, username, password } = req.body;
        
        if (!displayName || !username || !password) {
            return res.status(400).json({ error: 'همه فیلدها الزامی هستند' });
        }
        
        if (!/^[a-zA-Z0-9\s]+$/.test(displayName)) {
            return res.status(400).json({ error: 'اسم نمایشی باید فقط شامل حروف انگلیسی باشد' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'نام کاربری باید حداقل ۳ کاراکتر باشد' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' });
        }
        
        const users = await getUsers();
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است' });
        }
        
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        
        const newUser = {
            id: generateId(),
            displayName,
            username,
            password: hashedPassword,
            role: 'member',
            coins: parseInt(process.env.DEFAULT_COINS) || 25,
            tag: '',
            avatar: '',
            emotes: [],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        users.push(newUser);
        await saveUsers(users);
        
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                displayName: newUser.displayName,
                username: newUser.username,
                role: newUser.role,
                coins: newUser.coins,
                tag: newUser.tag,
                avatar: newUser.avatar
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'خطا در ثبت‌نام' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی هستند' });
        }
        
        const users = await getUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
        
        user.lastLogin = new Date().toISOString();
        await saveUsers(users);
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                displayName: user.displayName,
                username: user.username,
                role: user.role,
                coins: user.coins,
                tag: user.tag,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'خطا در ورود' });
    }
});

// ===== User Routes =====

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const users = await getUsers();
        const safeUsers = users.map(u => ({
            id: u.id,
            displayName: u.displayName,
            username: u.username,
            role: u.role,
            coins: u.coins,
            tag: u.tag,
            avatar: u.avatar,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        }));
        res.json(safeUsers);
    } catch (error) {
        console.error('❌ Error getting users:', error);
        res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
});

app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
        const users = await getUsers();
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        res.json({
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            role: user.role,
            coins: user.coins,
            tag: user.tag,
            avatar: user.avatar,
            rank: getCoinRank(user.coins)
        });
    } catch (error) {
        console.error('❌ Error getting user:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
    }
});

app.post('/api/users/coins', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { userId, amount } = req.body;
        
        if (!userId || amount === undefined) {
            return res.status(400).json({ error: 'شناسه کاربر و مقدار سکه الزامی است' });
        }
        
        const users = await getUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        const newCoins = Math.max(0, (user.coins || 0) + parseInt(amount));
        user.coins = newCoins;
        await saveUsers(users);
        
        res.json({
            message: 'سکه با موفقیت به‌روزرسانی شد',
            coins: user.coins,
            added: parseInt(amount)
        });
    } catch (error) {
        console.error('❌ Error updating coins:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی سکه' });
    }
});

app.put('/api/users/role', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        if (!userId || !role) {
            return res.status(400).json({ error: 'شناسه کاربر و نقش الزامی است' });
        }
        
        if (role !== 'admin' && role !== 'member') {
            return res.status(400).json({ error: 'نقش نامعتبر است' });
        }
        
        const users = await getUsers();
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        if (user.username === 'vatan_gap_admin') {
            return res.status(403).json({ error: 'نمی‌توان نقش ادمین اصلی را تغییر داد' });
        }
        
        user.role = role;
        await saveUsers(users);
        
        res.json({ message: 'نقش کاربر با موفقیت تغییر کرد', role: user.role });
    } catch (error) {
        console.error('❌ Error changing role:', error);
        res.status(500).json({ error: 'خطا در تغییر نقش' });
    }
});

app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const users = await getUsers();
        const userToDelete = users.find(u => u.id === userId);
        
        if (!userToDelete) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        if (userToDelete.username === 'vatan_gap_admin') {
            return res.status(403).json({ error: 'نمی‌توان ادمین اصلی را حذف کرد' });
        }
        
        const updatedUsers = users.filter(u => u.id !== userId);
        await saveUsers(updatedUsers);
        
        res.json({ message: 'کاربر با موفقیت حذف شد' });
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ error: 'خطا در حذف کاربر' });
    }
});

// ===== Announcement Routes =====

app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await getAnnouncements();
        announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(announcements);
    } catch (error) {
        console.error('❌ Error getting announcements:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعیه‌ها' });
    }
});

app.post('/api/announcements', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, content, date } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'عنوان و متن اطلاعیه الزامی است' });
        }
        
        const announcements = await getAnnouncements();
        const newAnnouncement = {
            id: generateId(),
            title: title.trim(),
            content: content.trim(),
            date: date || new Date().toLocaleDateString('fa-IR'),
            createdAt: new Date().toISOString()
        };
        
        announcements.push(newAnnouncement);
        await saveAnnouncements(announcements);
        
        res.status(201).json(newAnnouncement);
    } catch (error) {
        console.error('❌ Error creating announcement:', error);
        res.status(500).json({ error: 'خطا در افزودن اطلاعیه' });
    }
});

app.delete('/api/announcements/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const announcements = await getAnnouncements();
        const updated = announcements.filter(a => a.id !== req.params.id);
        await saveAnnouncements(updated);
        res.json({ message: 'اطلاعیه با موفقیت حذف شد' });
    } catch (error) {
        console.error('❌ Error deleting announcement:', error);
        res.status(500).json({ error: 'خطا در حذف اطلاعیه' });
    }
});

// ===== Member Routes =====

app.get('/api/members', async (req, res) => {
    try {
        const members = await getMembers();
        const sorted = members.sort((a, b) => (a.order || 999) - (b.order || 999));
        res.json(sorted);
    } catch (error) {
        console.error('❌ Error getting members:', error);
        res.status(500).json({ error: 'خطا در دریافت اعضا' });
    }
});

app.post('/api/members', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { displayName, tag, order } = req.body;
        
        if (!displayName) {
            return res.status(400).json({ error: 'اسم نمایشی الزامی است' });
        }
        
        const members = await getMembers();
        const newMember = {
            id: generateId(),
            displayName: displayName.trim(),
            tag: tag ? tag.trim() : 'عضو',
            order: parseInt(order) || 999,
            createdAt: new Date().toISOString()
        };
        
        members.push(newMember);
        await saveMembers(members);
        
        res.status(201).json(newMember);
    } catch (error) {
        console.error('❌ Error creating member:', error);
        res.status(500).json({ error: 'خطا در افزودن عضو' });
    }
});

app.put('/api/members/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { displayName, tag, order } = req.body;
        const members = await getMembers();
        const member = members.find(m => m.id === req.params.id);
        
        if (!member) {
            return res.status(404).json({ error: 'عضو یافت نشد' });
        }
        
        if (displayName) member.displayName = displayName.trim();
        if (tag) member.tag = tag.trim();
        if (order) member.order = parseInt(order);
        
        await saveMembers(members);
        res.json(member);
    } catch (error) {
        console.error('❌ Error updating member:', error);
        res.status(500).json({ error: 'خطا در ویرایش عضو' });
    }
});

app.delete('/api/members/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const members = await getMembers();
        const updated = members.filter(m => m.id !== req.params.id);
        await saveMembers(updated);
        res.json({ message: 'عضو با موفقیت حذف شد' });
    } catch (error) {
        console.error('❌ Error deleting member:', error);
        res.status(500).json({ error: 'خطا در حذف عضو' });
    }
});

// ===== Battle Routes =====

app.get('/api/battles', async (req, res) => {
    try {
        const battles = await getBattles();
        battles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(battles);
    } catch (error) {
        console.error('❌ Error getting battles:', error);
        res.status(500).json({ error: 'خطا در دریافت نتایج جنگ‌ها' });
    }
});

app.post('/api/battles', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { date, opponent, result, description } = req.body;
        
        if (!date || !opponent || !result) {
            return res.status(400).json({ error: 'تاریخ، نام حریف و نتیجه الزامی هستند' });
        }
        
        if (!['پیروزی', 'شکست', 'مساوی'].includes(result)) {
            return res.status(400).json({ error: 'نتیجه نامعتبر است' });
        }
        
        const battles = await getBattles();
        const newBattle = {
            id: generateId(),
            date: date.trim(),
            opponent: opponent.trim(),
            result,
            description: description ? description.trim() : '',
            createdAt: new Date().toISOString()
        };
        
        battles.push(newBattle);
        await saveBattles(battles);
        
        res.status(201).json(newBattle);
    } catch (error) {
        console.error('❌ Error creating battle:', error);
        res.status(500).json({ error: 'خطا در ثبت نتیجه جنگ' });
    }
});

app.delete('/api/battles/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const battles = await getBattles();
        const updated = battles.filter(b => b.id !== req.params.id);
        await saveBattles(updated);
        res.json({ message: 'نتیجه جنگ با موفقیت حذف شد' });
    } catch (error) {
        console.error('❌ Error deleting battle:', error);
        res.status(500).json({ error: 'خطا در حذف نتیجه جنگ' });
    }
});

// ===== Shop Routes =====

app.get('/api/shop', async (req, res) => {
    try {
        const items = await getShopItems();
        const tags = items.filter(i => i.type === 'tag').sort((a, b) => (a.order || 0) - (b.order || 0));
        const avatars = items.filter(i => i.type === 'avatar');
        const emotes = items.filter(i => i.type === 'emote');
        res.json({ tags, avatars, emotes });
    } catch (error) {
        console.error('❌ Error getting shop items:', error);
        res.status(500).json({ error: 'خطا در دریافت اقلام فروشگاه' });
    }
});

app.post('/api/shop/purchase', authenticateToken, async (req, res) => {
    try {
        const { itemId } = req.body;
        
        if (!itemId) {
            return res.status(400).json({ error: 'شناسه کالا الزامی است' });
        }
        
        const users = await getUsers();
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        const items = await getShopItems();
        const item = items.find(i => i.id === itemId);
        
        if (!item) {
            return res.status(404).json({ error: 'کالا یافت نشد' });
        }
        
        if (user.coins < item.price) {
            return res.status(400).json({ error: 'سکه کافی نیست' });
        }
        
        if (item.type === 'tag') {
            if (user.tag === item.name) {
                return res.status(400).json({ error: 'شما قبلاً این تگ را دارید' });
            }
            const prevTag = items.find(i => i.type === 'tag' && i.order === item.order - 1);
            if (prevTag && user.tag !== prevTag.name && user.tag !== '') {
                return res.status(400).json({ error: 'لطفاً ابتدا تگ قبلی را بخرید' });
            }
            user.tag = item.name;
        } else if (item.type === 'avatar') {
            user.avatar = item.icon;
        } else if (item.type === 'emote') {
            if (!user.emotes) user.emotes = [];
            if (user.emotes.includes(item.icon)) {
                return res.status(400).json({ error: 'شما قبلاً این ایموجی را دارید' });
            }
            user.emotes.push(item.icon);
        }
        
        user.coins -= item.price;
        await saveUsers(users);
        
        res.json({
            message: 'خرید با موفقیت انجام شد',
            coins: user.coins,
            tag: user.tag,
            avatar: user.avatar,
            emotes: user.emotes
        });
    } catch (error) {
        console.error('❌ Error purchasing item:', error);
        res.status(500).json({ error: 'خطا در خرید' });
    }
});

// ===== Challenge Routes =====

app.get('/api/challenges', authenticateToken, async (req, res) => {
    try {
        let challenges = await getChallenges();
        const today = new Date().toDateString();
        const lastReset = challenges.length > 0 ? new Date(challenges[0].date).toDateString() : '';
        
        if (lastReset !== today) {
            challenges = generateDailyChallenges();
            await saveChallenges(challenges);
        }
        
        res.json(challenges);
    } catch (error) {
        console.error('❌ Error getting challenges:', error);
        res.status(500).json({ error: 'خطا در دریافت چالش‌ها' });
    }
});

function generateDailyChallenges() {
    const today = new Date().toISOString();
    return [
        {
            id: generateId(),
            title: 'امروز ۳ بازی انجام بده',
            description: '۳ بازی مختلف را امروز انجام دهید',
            reward: 20,
            type: 'play_games',
            target: 3,
            progress: 0,
            completed: false,
            date: today
        },
        {
            id: generateId(),
            title: '۵ بازی پشت سر هم ببر',
            description: '۵ بازی متوالی را با پیروزی به پایان برسانید',
            reward: 50,
            type: 'win_streak',
            target: 5,
            progress: 0,
            completed: false,
            date: today
        },
        {
            id: generateId(),
            title: 'با ۳ کاربر مختلف بازی کن',
            description: 'با ۳ کاربر مختلف در بازی‌های آنلاین شرکت کنید',
            reward: 30,
            type: 'play_with_players',
            target: 3,
            progress: 0,
            completed: false,
            date: today
        }
    ];
}

app.post('/api/challenges/progress', authenticateToken, async (req, res) => {
    try {
        const { challengeId, progress } = req.body;
        
        if (!challengeId) {
            return res.status(400).json({ error: 'شناسه چالش الزامی است' });
        }
        
        const challenges = await getChallenges();
        const challenge = challenges.find(c => c.id === challengeId);
        
        if (!challenge) {
            return res.status(404).json({ error: 'چالش یافت نشد' });
        }
        
        if (challenge.completed) {
            return res.json({ message: 'چالش قبلاً کامل شده است', completed: true });
        }
        
        challenge.progress = Math.min(challenge.progress + (progress || 1), challenge.target);
        
        if (challenge.progress >= challenge.target) {
            challenge.completed = true;
            const users = await getUsers();
            const user = users.find(u => u.id === req.user.id);
            if (user) {
                user.coins += challenge.reward;
                await saveUsers(users);
            }
        }
        
        await saveChallenges(challenges);
        
        res.json({
            progress: challenge.progress,
            completed: challenge.completed,
            reward: challenge.completed ? challenge.reward : 0
        });
    } catch (error) {
        console.error('❌ Error updating challenge:', error);
        res.status(500).json({ error: 'خطا در بروزرسانی چالش' });
    }
});

// ===== Tournament Routes =====

app.get('/api/tournaments/current', async (req, res) => {
    try {
        const tournaments = await getTournaments();
        const now = new Date();
        const current = tournaments.find(t => 
            new Date(t.startDate) <= now && new Date(t.endDate) >= now
        );
        
        if (current) {
            res.json(current);
        } else {
            const newTournament = {
                id: generateId(),
                week: getWeekNumber(),
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                winners: { first: null, second: null, third: null },
                participants: [],
                createdAt: new Date().toISOString()
            };
            tournaments.push(newTournament);
            await saveTournaments(tournaments);
            res.json(newTournament);
        }
    } catch (error) {
        console.error('❌ Error getting tournament:', error);
        res.status(500).json({ error: 'خطا در دریافت مسابقات' });
    }
});

function getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now - start) / (7 * 24 * 60 * 60 * 1000);
    return Math.ceil(diff);
}

// ============================================
// Socket.IO - Real-time Games with Room Management
// ============================================

const gameRooms = new Map();
const waitingPlayers = new Map();

io.on('connection', (socket) => {
    console.log(`🎮 New client connected: ${socket.id}`);
    
    let currentRoom = null;
    let currentPlayer = null;
    
    // === ایجاد اتاق جدید ===
    socket.on('create-room', (data) => {
        const { gameType, playerName, betAmount, roomCode } = data;
        const upperCode = roomCode.toUpperCase();
        
        if (gameRooms.has(upperCode)) {
            socket.emit('room-error', { error: 'این کد قبلاً استفاده شده است' });
            return;
        }
        
        const room = {
            id: upperCode,
            gameType: gameType,
            players: [{ name: playerName, socketId: socket.id }],
            betAmount: betAmount,
            status: 'waiting',
            createdAt: Date.now()
        };
        
        gameRooms.set(upperCode, room);
        currentRoom = upperCode;
        currentPlayer = playerName;
        socket.join(upperCode);
        
        console.log(`✅ Room created: ${upperCode} by ${playerName}`);
        console.log(`📋 Active rooms:`, Array.from(gameRooms.keys()));
        
        socket.emit('room-created', {
            roomCode: upperCode,
            room: room
        });
    });
    
    // === پیوستن به اتاق با کد ===
    socket.on('join-room-by-code', (data) => {
        const { gameType, roomCode, playerName, betAmount } = data;
        const upperCode = roomCode.toUpperCase();
        
        console.log(`🔍 Searching for room: "${upperCode}"`);
        console.log(`📋 Available rooms:`, Array.from(gameRooms.keys()));
        
        if (!gameRooms.has(upperCode)) {
            socket.emit('room-error', { error: `کد "${upperCode}" نامعتبر است! اتاقی با این کد وجود ندارد` });
            return;
        }
        
        const room = gameRooms.get(upperCode);
        
        if (room.players.length >= 2) {
            socket.emit('room-error', { error: 'اتاق پر است! (حداکثر ۲ نفر)' });
            return;
        }
        
        if (room.players[0].socketId === socket.id) {
            socket.emit('room-error', { error: 'شما صاحب اتاق هستید!' });
            return;
        }
        
        room.players.push({ name: playerName, socketId: socket.id });
        room.status = 'playing';
        gameRooms.set(upperCode, room);
        
        socket.join(upperCode);
        currentRoom = upperCode;
        currentPlayer = playerName;
        
        console.log(`✅ ${playerName} joined room: ${upperCode}`);
        
        // ====== اول به نفر دوم بگو که به اتاق پیوستی ======
        socket.emit('room-joined', {
            roomCode: upperCode,
            room: room
        });
        
        // ====== بعد از 500ms به هر دو نفر بگو بازی شروع شد ======
        setTimeout(() => {
            io.to(upperCode).emit('game-start', {
                roomCode: upperCode,
                players: room.players,
                gameType: gameType,
                betAmount: betAmount
            });
        }, 500);
    });
    
    // === اتصال شانسی ===
    socket.on('join-random', (data) => {
        const { gameType, playerName, betAmount } = data;
        const key = gameType;
        
        console.log(`🎯 ${playerName} looking for random game (${gameType})`);
        console.log(`👥 Waiting players:`, Array.from(waitingPlayers.keys()));
        
        if (waitingPlayers.has(key) && waitingPlayers.get(key).length > 0) {
            const opponent = waitingPlayers.get(key).shift();
            
            let foundRoom = null;
            let foundCode = null;
            for (const [code, room] of gameRooms) {
                if (room.players[0].socketId === opponent.socketId && room.players.length === 1) {
                    foundRoom = room;
                    foundCode = code;
                    break;
                }
            }
            
            if (foundRoom && foundCode) {
                foundRoom.players.push({ name: playerName, socketId: socket.id });
                foundRoom.status = 'playing';
                gameRooms.set(foundCode, foundRoom);
                
                socket.join(foundCode);
                currentRoom = foundCode;
                currentPlayer = playerName;
                
                console.log(`✅ ${playerName} matched with ${opponent.name} in room: ${foundCode}`);
                
                // ====== اول به نفر دوم بگو که به اتاق پیوستی ======
                socket.emit('room-joined', {
                    roomCode: foundCode,
                    room: foundRoom
                });
                
                // ====== بعد از 500ms به هر دو نفر بگو بازی شروع شد ======
                setTimeout(() => {
                    io.to(foundCode).emit('game-start', {
                        roomCode: foundCode,
                        players: foundRoom.players,
                        gameType: gameType,
                        betAmount: betAmount
                    });
                }, 500);
                return;
            }
        }
        
        if (!waitingPlayers.has(key)) {
            waitingPlayers.set(key, []);
        }
        waitingPlayers.get(key).push({ name: playerName, socketId: socket.id });
        
        console.log(`⏳ ${playerName} added to waiting list (${gameType})`);
        socket.emit('waiting', { message: 'در حال جستجوی حریف...' });
        
        const timeoutId = setTimeout(() => {
            const list = waitingPlayers.get(key);
            if (list) {
                const index = list.findIndex(p => p.socketId === socket.id);
                if (index !== -1) {
                    list.splice(index, 1);
                    if (list.length === 0) {
                        waitingPlayers.delete(key);
                    }
                    socket.emit('waiting-timeout', { message: 'زمان جستجو به پایان رسید' });
                    console.log(`⏰ ${playerName} removed from waiting list (timeout)`);
                }
            }
        }, 30000);
        
        socket._waitingTimeout = timeoutId;
    });
    
    // === لغو جستجوی شانسی ===
    socket.on('cancel-random-search', (data) => {
        const { gameType, playerName } = data;
        const key = gameType;
        
        if (waitingPlayers.has(key)) {
            const list = waitingPlayers.get(key);
            const index = list.findIndex(p => p.name === playerName);
            if (index !== -1) {
                list.splice(index, 1);
                if (list.length === 0) {
                    waitingPlayers.delete(key);
                }
                console.log(`❌ ${playerName} cancelled random search`);
                socket.emit('random-search-cancelled', { message: 'جستجو لغو شد' });
            }
        }
    });
    
    // === دریافت حرکت بازی ===
    socket.on('game-move', (data) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('game-update', {
                ...data,
                playerId: socket.id
            });
        }
    });
    
    // === پایان بازی ===
    socket.on('game-over', (data) => {
        if (currentRoom) {
            io.to(currentRoom).emit('game-finished', {
                ...data,
                roomCode: currentRoom
            });
            setTimeout(() => {
                if (gameRooms.has(currentRoom)) {
                    gameRooms.delete(currentRoom);
                    console.log(`🗑️ Room ${currentRoom} deleted`);
                }
            }, 300000);
        }
    });
    
    // === خروج از بازی ===
    socket.on('leave-game', () => {
        if (currentRoom) {
            socket.leave(currentRoom);
            const room = gameRooms.get(currentRoom);
            if (room) {
                room.players = room.players.filter(p => p.socketId !== socket.id);
                if (room.players.length === 0) {
                    gameRooms.delete(currentRoom);
                    console.log(`🗑️ Room ${currentRoom} deleted (empty)`);
                } else {
                    io.to(currentRoom).emit('player-left', {
                        playerId: socket.id,
                        playerName: currentPlayer
                    });
                }
            }
            currentRoom = null;
            currentPlayer = null;
        }
        
        for (const [key, list] of waitingPlayers) {
            const index = list.findIndex(p => p.socketId === socket.id);
            if (index !== -1) {
                list.splice(index, 1);
                if (list.length === 0) {
                    waitingPlayers.delete(key);
                }
                if (socket._waitingTimeout) {
                    clearTimeout(socket._waitingTimeout);
                }
                break;
            }
        }
    });
    
    // === قطع اتصال ===
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        
        if (currentRoom) {
            const room = gameRooms.get(currentRoom);
            if (room) {
                room.players = room.players.filter(p => p.socketId !== socket.id);
                if (room.players.length === 0) {
                    gameRooms.delete(currentRoom);
                    console.log(`🗑️ Room ${currentRoom} deleted (disconnect)`);
                } else {
                    io.to(currentRoom).emit('player-left', {
                        playerId: socket.id,
                        playerName: currentPlayer
                    });
                }
            }
        }
        
        for (const [key, list] of waitingPlayers) {
            const index = list.findIndex(p => p.socketId === socket.id);
            if (index !== -1) {
                list.splice(index, 1);
                if (list.length === 0) {
                    waitingPlayers.delete(key);
                }
                if (socket._waitingTimeout) {
                    clearTimeout(socket._waitingTimeout);
                }
                break;
            }
        }
    });
});

// ============================================
// Initialize Data
// ============================================

async function initializeData() {
    try {
        console.log('📁 Initializing data...');
        await ensureDataDir();
        
        const users = await getUsers();
        const adminExists = users.find(u => u.username === 'vatan_gap_admin');
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('202648107vatangap', BCRYPT_ROUNDS);
            users.push({
                id: 'admin_' + generateId(),
                displayName: 'ادمین',
                username: 'vatan_gap_admin',
                password: hashedPassword,
                role: 'admin',
                coins: 999999,
                tag: 'سازنده سایت',
                avatar: '🏛️',
                emotes: ['💥', '🔥', '⚡', '💫', '🌪️', '🏹'],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            await saveUsers(users);
            console.log('✅ Admin user created');
        }
        
        const shopItems = await getShopItems();
        if (shopItems.length === 0) {
            const items = [
                { id: 'tag1', type: 'tag', name: 'نوب نیستم', price: 50, order: 1, icon: '🏷️' },
                { id: 'tag2', type: 'tag', name: 'دارم پرو میشم', price: 90, order: 2, icon: '🏷️' },
                { id: 'tag3', type: 'tag', name: 'پرو ام', price: 145, order: 3, icon: '🏷️' },
                { id: 'tag4', type: 'tag', name: 'حرفه ایم', price: 160, order: 4, icon: '🏷️' },
                { id: 'tag5', type: 'tag', name: 'استادم', price: 200, order: 5, icon: '🏷️' },
                { id: 'tag6', type: 'tag', name: 'بقیه شاگردامن', price: 270, order: 6, icon: '🏷️' },
                { id: 'tag7', type: 'tag', name: 'خفن ترینم', price: 350, order: 7, icon: '🏷️' },
                { id: 'tag8', type: 'tag', name: 'جنگ جوی سطح یکم', price: 400, order: 8, icon: '🏷️' },
                { id: 'tag9', type: 'tag', name: 'جنگ جوی سطح دوام', price: 600, order: 9, icon: '🏷️' },
                { id: 'tag10', type: 'tag', name: 'شکست ناپذیرم', price: 1000, order: 10, icon: '🏷️' },
                { id: 'avatar1', type: 'avatar', name: 'عقاب', price: 50, icon: '🦅' },
                { id: 'avatar2', type: 'avatar', name: 'اژدها', price: 80, icon: '🐉' },
                { id: 'avatar3', type: 'avatar', name: 'اسپایدر', price: 60, icon: '🕷️' },
                { id: 'avatar4', type: 'avatar', name: 'گرگ', price: 40, icon: '🐺' },
                { id: 'avatar5', type: 'avatar', name: 'خفاش', price: 30, icon: '🦇' },
                { id: 'avatar6', type: 'avatar', name: 'اسب', price: 45, icon: '🐎' },
                { id: 'avatar7', type: 'avatar', name: 'عقرب', price: 35, icon: '🦂' },
                { id: 'avatar8', type: 'avatar', name: 'شیر ایرانی', price: 100, icon: '🦁' },
                { id: 'emote1', type: 'emote', name: 'بمب', price: 20, icon: '💥' },
                { id: 'emote2', type: 'emote', name: 'آتش', price: 15, icon: '🔥' },
                { id: 'emote3', type: 'emote', name: 'برق', price: 25, icon: '⚡' },
                { id: 'emote4', type: 'emote', name: 'ستاره', price: 30, icon: '💫' },
                { id: 'emote5', type: 'emote', name: 'طوفان', price: 40, icon: '🌪️' },
                { id: 'emote6', type: 'emote', name: 'تیر', price: 20, icon: '🏹' }
            ];
            await saveShopItems(items);
            console.log('✅ Shop items created');
        }
        
        const announcements = await getAnnouncements();
        if (announcements.length === 0) {
            const sampleAnnouncements = [
                {
                    id: generateId(),
                    title: 'به اتحاد 𓄂𝐕𝐀𝐓𝐀𝐍࿐ خوش آمدید!',
                    content: 'ما یک اتحادیه قدرتمند هستیم با هدف پیروزی در میدان‌های نبرد. به خانواده بزرگ واتان خوش آمدید. 🏛️',
                    date: new Date().toLocaleDateString('fa-IR'),
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    title: 'مسابقه هفتگی',
                    content: 'مسابقه هفتگی این هفته روز جمعه ساعت ۲۰ برگزار میشود. همه اعضا باید حضور داشته باشند. ⚔️',
                    date: new Date().toLocaleDateString('fa-IR'),
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    title: 'بهروزرسانی سایت',
                    content: 'سایت اتحاد به‌روزرسانی شد. امکانات جدید مانند فروشگاه و چالش‌های روزانه اضافه شد. 🚀',
                    date: new Date().toLocaleDateString('fa-IR'),
                    createdAt: new Date().toISOString()
                }
            ];
            await saveAnnouncements(sampleAnnouncements);
            console.log('✅ Sample announcements created');
        }
        
        console.log('✅ Data initialization complete!');
    } catch (error) {
        console.error('❌ Error initializing data:', error);
        throw error;
    }
}

// ============================================
// Start Server
// ============================================

async function startServer() {
    try {
        await initializeData();
        
        server.listen(PORT, () => {
            console.log('========================================');
            console.log('🏛️  𓄂𝐕𝐀𝐓𝐀𝐍࿐  Server Started');
            console.log('========================================');
            console.log(`🚀 Server running on: http://localhost:${PORT}`);
            console.log(`📁 Data directory: ${DATA_DIR}`);
            console.log(`🎮 WebSocket: ws://localhost:${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('========================================');
            console.log('📁 ساختار فایل‌ها:');
            console.log('   📄 index.html (همه صفحات)');
            console.log('   🎨 style.css (همه استایل‌ها)');
            console.log('   ⚡ script.js (همه اسکریپت‌ها)');
            console.log('========================================');
            console.log('✅ Press Ctrl+C to stop the server');
            console.log('========================================');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// ============================================
// Error Handling
// ============================================

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('SIGINT', () => {
    console.log('\n📴 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// ============================================
// Start
// ============================================

startServer();

module.exports = { app, server, io };