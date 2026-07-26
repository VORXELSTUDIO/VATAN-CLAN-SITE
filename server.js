const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ============================================
// DATABASE (JSON FILE)
// ============================================
const DB_FILE = './database.json';

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialDB = {
                users: [],
                announcements: [],
                members: [],
                battles: [],
                chatMessages: []
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
            return initialDB;
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading DB:', error);
        return { users: [], announcements: [], members: [], battles: [], chatMessages: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing DB:', error);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ============================================
// MODELS
// ============================================
const User = {
    find: (filter = {}) => {
        const db = readDB();
        return db.users.filter(user => {
            for (let key in filter) {
                if (user[key] !== filter[key]) return false;
            }
            return true;
        });
    },
    findOne: (filter) => {
        const db = readDB();
        return db.users.find(user => {
            for (let key in filter) {
                if (user[key] !== filter[key]) return false;
            }
            return true;
        }) || null;
    },
    create: async (data) => {
        const db = readDB();
        const newUser = {
            _id: generateId(),
            ...data,
            password: await bcrypt.hash(data.password, 10),
            createdAt: new Date().toISOString()
        };
        db.users.push(newUser);
        writeDB(db);
        return newUser;
    },
    findByIdAndUpdate: async (id, updates) => {
        const db = readDB();
        const index = db.users.findIndex(u => u._id === id);
        if (index === -1) return null;
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }
        db.users[index] = { ...db.users[index], ...updates };
        writeDB(db);
        return db.users[index];
    },
    findById: (id) => {
        const db = readDB();
        return db.users.find(u => u._id === id) || null;
    }
};

const Announcement = {
    find: () => {
        const db = readDB();
        return db.announcements || [];
    },
    create: (data) => {
        const db = readDB();
        const newItem = { _id: generateId(), ...data, createdAt: new Date().toISOString() };
        db.announcements.push(newItem);
        writeDB(db);
        return newItem;
    },
    findByIdAndDelete: (id) => {
        const db = readDB();
        db.announcements = db.announcements.filter(a => a._id !== id);
        writeDB(db);
        return true;
    }
};

const Member = {
    find: () => {
        const db = readDB();
        return db.members.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    create: (data) => {
        const db = readDB();
        const newItem = { _id: generateId(), ...data, createdAt: new Date().toISOString() };
        db.members.push(newItem);
        writeDB(db);
        return newItem;
    },
    findByIdAndUpdate: (id, data) => {
        const db = readDB();
        const index = db.members.findIndex(m => m._id === id);
        if (index === -1) return null;
        db.members[index] = { ...db.members[index], ...data };
        writeDB(db);
        return db.members[index];
    },
    findByIdAndDelete: (id) => {
        const db = readDB();
        db.members = db.members.filter(m => m._id !== id);
        writeDB(db);
        return true;
    }
};

const Battle = {
    find: () => {
        const db = readDB();
        return db.battles || [];
    },
    create: (data) => {
        const db = readDB();
        const newItem = { _id: generateId(), ...data, createdAt: new Date().toISOString() };
        db.battles.push(newItem);
        writeDB(db);
        return newItem;
    },
    findByIdAndDelete: (id) => {
        const db = readDB();
        db.battles = db.battles.filter(b => b._id !== id);
        writeDB(db);
        return true;
    }
};

const ChatMessage = {
    find: () => {
        const db = readDB();
        return db.chatMessages || [];
    },
    create: (data) => {
        const db = readDB();
        if (!db.chatMessages) {
            db.chatMessages = [];
        }
        const newItem = {
            _id: generateId(),
            ...data,
            timestamp: new Date().toISOString()
        };
        db.chatMessages.push(newItem);
        if (db.chatMessages.length > 200) {
            db.chatMessages = db.chatMessages.slice(-200);
        }
        writeDB(db);
        return newItem;
    },
    deleteAll: () => {
        const db = readDB();
        db.chatMessages = [];
        writeDB(db);
        return true;
    }
};

// ============================================
// CREATE ADMIN
// ============================================
const createAdmin = async () => {
    const adminExists = User.findOne({ username: process.env.ADMIN_USERNAME || 'vatan_gap_admin' });
    if (!adminExists) {
        await User.create({
            displayName: 'Vatan Admin',
            username: process.env.ADMIN_USERNAME || 'vatan_gap_admin',
            password: process.env.ADMIN_PASSWORD || '202648107vatangap',
            role: 'admin',
            canChat: true
        });
        console.log('✅ Admin created');
    }
};
createAdmin();

// ============================================
// AUTH MIDDLEWARE
// ============================================
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    next();
};

// ============================================
// SOCKET.IO - مدیریت اتصالات (نسخه کامل)
// ============================================
const connectedUsers = new Map(); // socket.id -> userId
const userSockets = new Map(); // userId -> socket.id

// تابع قطع اتصال کاربر با شناسه
function disconnectUser(userId) {
    console.log(`🔍 Looking for user ${userId} to disconnect...`);
    
    const socketId = userSockets.get(userId);
    if (!socketId) {
        console.log(`⚠️ User ${userId} not found in connected users`);
        return false;
    }
    
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        console.log(`⚠️ Socket ${socketId} not found`);
        userSockets.delete(userId);
        return false;
    }
    
    console.log(`💥 Disconnecting user ${userId} (socket: ${socketId})`);
    
    // ارسال رویداد خروج اجباری
    socket.emit('forceLogout', {
        message: 'حساب کاربری شما توسط ادمین حذف شده است'
    });
    
    // قطع اتصال بعد از 500ms
    setTimeout(() => {
        try {
            socket.disconnect(true);
            console.log(`✅ User ${userId} disconnected successfully`);
        } catch (err) {
            console.error(`❌ Error disconnecting user ${userId}:`, err);
        }
    }, 500);
    
    // حذف از لیست‌ها
    connectedUsers.delete(socketId);
    userSockets.delete(userId);
    
    return true;
}

io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);
    
    // ============================================
    // ثبت شناسه کاربر
    // ============================================
    socket.on('registerUser', (userId) => {
        if (userId) {
            // حذف اتصال قبلی اگر وجود داشت
            if (userSockets.has(userId)) {
                const oldSocketId = userSockets.get(userId);
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) {
                    console.log(`🔄 Disconnecting old socket for user ${userId}`);
                    oldSocket.disconnect(true);
                }
                userSockets.delete(userId);
            }
            
            connectedUsers.set(socket.id, userId);
            userSockets.set(userId, socket.id);
            console.log(`👤 User ${userId} registered with socket ${socket.id}`);
            console.log(`📊 Total connected users: ${userSockets.size}`);
        }
    });
    
    // ============================================
    // ارسال تاریخچه چت به کاربر جدید
    // ============================================
    try {
        const messages = ChatMessage.find();
        console.log(`📨 Sending ${messages.length} chat messages to ${socket.id}`);
        const last100 = messages.slice(-100);
        socket.emit('chatHistory', last100);
        console.log('✅ Chat history sent');
    } catch (error) {
        console.error('❌ Error sending chat history:', error);
        socket.emit('chatHistory', []);
    }

    // ============================================
    // درخواست مجدد تاریخچه
    // ============================================
    socket.on('requestHistory', () => {
        console.log('📨 History requested by:', socket.id);
        try {
            const messages = ChatMessage.find();
            console.log(`📨 Sending ${messages.length} messages to ${socket.id}`);
            const last100 = messages.slice(-100);
            socket.emit('chatHistory', last100);
        } catch (error) {
            console.error('❌ Error sending history:', error);
            socket.emit('chatHistory', []);
        }
    });

    // ============================================
    // دریافت پیام جدید
    // ============================================
    socket.on('sendMessage', (data) => {
        try {
            console.log('📩 New message from:', data.sender);
            const { sender, text, imageUrl } = data;
            
            // ذخیره پیام در دیتابیس
            const message = ChatMessage.create({ sender, text, imageUrl });
            console.log('✅ Message saved:', message._id);
            
            // پاکسازی چت در صورت رسیدن به حد مجاز
            const allMessages = ChatMessage.find();
            if (allMessages.length >= 200) {
                ChatMessage.deleteAll();
                console.log('🗑️ Chat cleared (200 messages reached)');
            }
            
            // ارسال پیام به همه
            io.emit('newMessage', message);
            console.log('📤 Message broadcasted to all');
        } catch (error) {
            console.error('❌ Chat error:', error);
        }
    });

    // ============================================
    // قطع اتصال
    // ============================================
    socket.on('disconnect', () => {
        const userId = connectedUsers.get(socket.id);
        if (userId) {
            console.log(`👤 User ${userId} disconnected`);
            connectedUsers.delete(socket.id);
            userSockets.delete(userId);
        }
        console.log('🔴 User disconnected:', socket.id);
        console.log(`📊 Total connected users: ${userSockets.size}`);
    });
});

// ============================================
// API ROUTES
// ============================================

// ---- AUTH ----
app.post('/api/register', async (req, res) => {
    try {
        const { displayName, username, password } = req.body;
        
        const englishPattern = /^[A-Za-z\s]+$/;
        if (!englishPattern.test(displayName)) {
            return res.status(400).json({ error: 'اسم نمایشی باید فقط با حروف انگلیسی باشد' });
        }
        
        if (displayName.length < 2) {
            return res.status(400).json({ error: 'اسم نمایشی باید حداقل ۲ حرف باشد' });
        }
        
        const existing = User.findOne({ username });
        if (existing) return res.status(400).json({ error: 'نام کاربری تکراری است' });
        
        const user = await User.create({ displayName, username, password, role: 'member', canChat: false });
        res.json({ message: 'ثبت‌نام موفق بود' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است' });
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه است' });
        
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, canChat: user.canChat, displayName: user.displayName },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '7d' }
        );
        res.json({ token, user: { displayName: user.displayName, role: user.role, canChat: user.canChat } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---- ANNOUNCEMENTS ----
app.get('/api/announcements', (req, res) => {
    const announcements = Announcement.find();
    res.json(announcements);
});

app.post('/api/announcements', auth, adminOnly, (req, res) => {
    const { title, content, date } = req.body;
    const announcement = Announcement.create({ title, content, date });
    res.json(announcement);
});

app.delete('/api/announcements/:id', auth, adminOnly, (req, res) => {
    Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ---- MEMBERS ----
app.get('/api/members', (req, res) => {
    const members = Member.find();
    res.json(members);
});

app.post('/api/members', auth, adminOnly, (req, res) => {
    const { displayName, tag, order } = req.body;
    const member = Member.create({ displayName, tag, order: parseInt(order) || 0 });
    res.json(member);
});

app.put('/api/members/:id', auth, adminOnly, (req, res) => {
    const { displayName, tag, order } = req.body;
    const member = Member.findByIdAndUpdate(req.params.id, { displayName, tag, order: parseInt(order) || 0 });
    res.json(member);
});

app.delete('/api/members/:id', auth, adminOnly, (req, res) => {
    Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ---- BATTLES ----
app.get('/api/battles', (req, res) => {
    const battles = Battle.find();
    res.json(battles);
});

app.post('/api/battles', auth, adminOnly, (req, res) => {
    const { date, opponent, result, description } = req.body;
    const battle = Battle.create({ date, opponent, result, description });
    res.json(battle);
});

app.delete('/api/battles/:id', auth, adminOnly, (req, res) => {
    Battle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

// ---- USERS ----
app.get('/api/users', auth, adminOnly, (req, res) => {
    const db = readDB();
    const users = db.users.map(u => {
        const { password, ...rest } = u;
        return rest;
    });
    res.json(users);
});

// ---- TOGGLE CHAT ACCESS ----
app.put('/api/users/:id/chat', auth, adminOnly, async (req, res) => {
    console.log('🔥 TOGGLE CHAT ROUTE CALLED!');
    console.log('📌 User ID:', req.params.id);
    console.log('📌 New status:', req.body.canChat);
    
    try {
        const { canChat } = req.body;
        const db = readDB();
        const userIndex = db.users.findIndex(u => u._id === req.params.id);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        db.users[userIndex].canChat = canChat;
        writeDB(db);
        
        console.log('✅ Chat access changed to:', canChat);
        
        const { password, ...user } = db.users[userIndex];
        res.json({ message: 'دسترسی چت تغییر کرد', user });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ---- MAKE USER ADMIN ----
app.put('/api/users/:id/make-admin', auth, adminOnly, async (req, res) => {
    console.log('🔥 MAKE ADMIN ROUTE CALLED!');
    console.log('📌 User ID:', req.params.id);
    
    try {
        const db = readDB();
        const userIndex = db.users.findIndex(u => u._id === req.params.id);
        
        if (userIndex === -1) {
            console.log('❌ User not found!');
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        console.log('👤 User found:', db.users[userIndex].displayName);
        console.log('📌 Current role:', db.users[userIndex].role);
        
        db.users[userIndex].role = 'admin';
        writeDB(db);
        
        console.log('✅ Role changed to admin!');
        
        const { password, ...user } = db.users[userIndex];
        res.json({ message: 'کاربر به ادمین ارتقا یافت', user });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ---- CHANGE PASSWORD ----
app.post('/api/change-password', auth, adminOnly, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = User.findById(req.user.id);
        
        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) return res.status(401).json({ error: 'رمز فعلی اشتباه است' });
        
        await User.findByIdAndUpdate(req.user.id, { password: newPassword });
        res.json({ message: 'رمز با موفقیت تغییر کرد' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---- DELETE USER (نسخه کامل با قطع اتصال) ----
app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
    console.log('🔥 DELETE USER ROUTE CALLED!');
    console.log('📌 User ID:', req.params.id);
    
    try {
        const db = readDB();
        const userIndex = db.users.findIndex(u => u._id === req.params.id);
        
        if (userIndex === -1) {
            console.log('❌ User not found!');
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        
        // جلوگیری از حذف مدیر سایت
        if (db.users[userIndex].username === 'vatan_gap_admin') {
            console.log('❌ Cannot delete main admin!');
            return res.status(403).json({ error: 'امکان حذف مدیر سایت وجود ندارد' });
        }
        
        const deletedUser = db.users[userIndex];
        console.log(`👤 User to delete: ${deletedUser.displayName} (${deletedUser.username})`);
        
        // حذف کاربر از دیتابیس
        db.users.splice(userIndex, 1);
        writeDB(db);
        
        console.log(`🗑️ User deleted: ${deletedUser.username} (${req.params.id})`);
        
        // قطع اتصال کاربر در صورت آنلاین بودن
        const disconnected = disconnectUser(req.params.id);
        console.log(`📌 Disconnect user: ${disconnected ? '✅ Done' : '⚠️ Not connected'}`);
        
        // ارسال رویداد به همه کلاینت‌ها برای به‌روزرسانی
        io.emit('userDeleted', {
            userId: req.params.id,
            username: deletedUser.username
        });
        
        res.json({
            message: 'کاربر با موفقیت حذف شد',
            disconnected: disconnected
        });
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// STATIC FILES
// ============================================
app.use(express.static('public'));

// ============================================
// SERVER
// ============================================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Database file: ${DB_FILE}`);
    console.log(`👑 Admin: vatan_gap_admin`);
});