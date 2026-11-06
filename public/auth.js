// ============================================
// auth.js — localStorage «БД» + CRUD + ЧАТ
// ============================================
(function () {
    const DB_KEY = 'annam_brahma_db';
    const SESSION_KEY = 'annam_session';

    function now() { return new Date().toISOString(); }
    function uid() { return Date.now() + Math.floor(Math.random() * 1000); }

    function loadDB() {
        let db;
        try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch (e) { db = null; }
        if (!db || !db.users) {
            db = {
                users: [
                    { id: 1, login: 'admin', password: 'Admin123!', fullname: 'Администратор',
                      email: 'admin@annambrahma.ru', phone: '', role: 'admin', createdAt: now() },
                    { id: 2, login: 'user', password: 'User123!', fullname: 'Гость Ресторана',
                      email: 'user@annambrahma.ru', phone: '', role: 'user', createdAt: now() }
                ],
                sessions: [],
                audit: [],
                messages: [],
                settings: [
                    { key: 'restaurant_name', value: 'Annam Brahma' },
                    { key: 'contact_phone',   value: '+7 (3532) 12-34-56' }
                ],
                bookings: []
            };
            saveDB(db);
        }
        return db;
    }
    function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

    function log(db, userId, action, details) {
        db.audit.push({ id: uid(), userId: userId ?? null, action, details, at: now() });
    }

    function setSession(user) {
        const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const sess = { token, userId: user.id, login: user.login, name: user.fullname,
                       role: user.role, expiresAt: Date.now() + 86400000 * 7 };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
        const db = loadDB();
        db.sessions.push({ token, userId: user.id, expiresAt: sess.expiresAt });
        log(db, user.id, 'login', `Вход: ${user.login} (${user.role})`);
        saveDB(db);
        return sess;
    }

    function getSession() {
        try {
            const s = JSON.parse(localStorage.getItem(SESSION_KEY));
            if (!s) return null;
            if (s.expiresAt < Date.now()) { clearSession(); return null; }
            return s;
        } catch { return null; }
    }

    function clearSession() {
        const s = getSession();
        if (s) {
            const db = loadDB();
            db.sessions = db.sessions.filter(x => x.token !== s.token);
            log(db, s.userId, 'logout', 'Выход из системы');
            saveDB(db);
        }
        localStorage.removeItem(SESSION_KEY);
    }

    window.Auth = {
        // ---------- АВТОРИЗАЦИЯ ----------
        register(data) {
            const db = loadDB();
            const login = (data.login || '').trim();
            if (!login || !data.password || !data.fullname)
                return { success: false, message: 'Заполните логин, пароль и имя' };
            if (data.password.length < 6)
                return { success: false, message: 'Пароль минимум 6 символов' };
            if (db.users.some(u => u.login.toLowerCase() === login.toLowerCase()))
                return { success: false, message: 'Такой логин уже занят' };

            const user = {
                id: uid(), login, password: data.password,
                fullname: data.fullname.trim(),
                email: (data.email || '').trim(),
                phone: (data.phone || '').trim(),
                role: 'user', createdAt: now()
            };
            db.users.push(user);
            log(db, user.id, 'register', `Новый пользователь: ${login}`);
            saveDB(db);
            return { success: true, message: 'Регистрация успешна! Теперь войдите.' };
        },

        login(login, password) {
            const db = loadDB();
            const user = db.users.find(u =>
                u.login.toLowerCase() === String(login).toLowerCase().trim() &&
                u.password === password
            );
            if (!user) {
                log(db, null, 'login_fail', `Неудачный вход: ${login}`);
                saveDB(db);
                return { success: false, message: 'Неверный логин или пароль' };
            }
            const sess = setSession(user);
            return {
                success: true, message: 'Добро пожаловать, ' + user.fullname + '!',
                role: user.role,
                redirect: user.role === 'admin' ? 'admin.html' : 'profile.html', // Юзера теперь кидает в кабинет
                session: sess
            };
        },

        logout() { clearSession(); window.location.href = 'login.html'; },

        me() {
            const s = getSession();
            if (!s) return null;
            return { id: s.userId, login: s.login, name: s.name, role: s.role };
        },

        requireAdmin() {
            const me = this.me();
            if (!me || me.role !== 'admin') {
                alert('Доступ только для администратора');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        },

        // ---------- ЧТЕНИЕ ----------
        getAll() {
            const db = loadDB();
            return {
                users: db.users.map(u => ({ ...u, password: '••••••' })),
                sessions: db.sessions,
                audit: db.audit.slice().reverse(),
                messages: db.messages,
                settings: db.settings,
                bookings: db.bookings
            };
        },

        // ---------- CRUD: ПОЛЬЗОВАТЕЛИ ----------
        createUser(data) {
            const db = loadDB();
            const login = (data.login || '').trim();
            if (!login || !data.password || !data.fullname)
                return { success: false, message: 'Заполните логин, пароль, имя' };
            if (data.password.length < 6)
                return { success: false, message: 'Пароль минимум 6 символов' };
            if (db.users.some(u => u.login.toLowerCase() === login.toLowerCase()))
                return { success: false, message: 'Логин занят' };
            const user = {
                id: uid(), login, password: data.password,
                fullname: data.fullname.trim(),
                email: (data.email || '').trim(),
                phone: (data.phone || '').trim(),
                role: data.role === 'admin' ? 'admin' : 'user',
                createdAt: now()
            };
            db.users.push(user);
            log(db, this.me()?.id, 'admin_create_user', `Создан: ${login}`);
            saveDB(db);
            return { success: true, message: 'Пользователь создан', user };
        },

        updateUser(id, patch) {
            const db = loadDB();
            const u = db.users.find(x => x.id === id);
            if (!u) return { success: false, message: 'Не найден' };
            if (u.role === 'admin' && patch.role === 'user') {
                const admins = db.users.filter(x => x.role === 'admin');
                if (admins.length <= 1) return { success: false, message: 'Нельзя убрать последнего админа' };
            }
            if (patch.login && db.users.some(x => x.id !== id && x.login.toLowerCase() === patch.login.toLowerCase()))
                return { success: false, message: 'Логин занят' };
            Object.assign(u, patch);
            log(db, this.me()?.id, 'admin_update_user', `Изменён: ${u.login}`);
            saveDB(db);
            return { success: true, message: 'Обновлено' };
        },

        deleteUser(id) {
            const db = loadDB();
            const u = db.users.find(x => x.id === id);
            if (!u) return { success: false, message: 'Не найден' };
            if (u.role === 'admin' && db.users.filter(x => x.role === 'admin').length <= 1)
                return { success: false, message: 'Нельзя удалить последнего админа' };
            db.users = db.users.filter(x => x.id !== id);
            db.sessions = db.sessions.filter(s => s.userId !== id);
            log(db, this.me()?.id, 'admin_delete_user', `Удалён: ${u.login}`);
            saveDB(db);
            return { success: true, message: 'Удалено' };
        },

        // ---------- CRUD: БРОНИ ----------
        addBooking(b) {
            const db = loadDB();
            const row = { id: uid(), ...b, at: now() };
            db.bookings.push(row);
            log(db, this.me()?.id ?? null, 'booking_create', `Бронь: ${b.name} ${b.date}`);
            saveDB(db);
            return row;
        },
        updateBooking(id, patch) {
            const db = loadDB();
            const r = db.bookings.find(x => x.id === id);
            if (!r) return { success: false, message: 'Не найдено' };
            Object.assign(r, patch);
            saveDB(db);
            return { success: true };
        },
        deleteBooking(id) {
            const db = loadDB();
            db.bookings = db.bookings.filter(x => x.id !== id);
            log(db, this.me()?.id, 'admin_delete_booking', `id=${id}`);
            saveDB(db);
            return { success: true, message: 'Удалено' };
        },

        // ---------- ЧАТ ----------
        sendMessage(text) {
            const me = this.me();
            if (!me) return null;
            const db = loadDB();
            const admin = db.users.find(u => u.role === 'admin');
            
            const msg = {
                id: uid(),
                fromUserId: me.id,
                toUserId: admin ? admin.id : null, // Шлем админу
                text: text,
                isRead: false,
                at: now()
            };
            db.messages.push(msg);
            saveDB(db);
            return msg;
        },

        replyToUser(userId, text) {
            const me = this.me();
            if (!me || me.role !== 'admin') return null;
            const db = loadDB();
            
            const msg = {
                id: uid(),
                fromUserId: me.id,
                toUserId: userId,
                text: text,
                isRead: false,
                at: now()
            };
            db.messages.push(msg);
            saveDB(db);
            return msg;
        },

        getChat(userId) {
            const db = loadDB();
            const me = this.me();
            if (!me) return [];
            
            // Если я админ, показываю переписку с конкретным юзером
            if (me.role === 'admin') {
                return db.messages.filter(m => 
                    (m.fromUserId === userId && m.toUserId === me.id) || 
                    (m.fromUserId === me.id && m.toUserId === userId)
                ).sort((a, b) => new Date(a.at) - new Date(b.at));
            } 
            // Если я юзер, показываю переписку с админом
            else {
                return db.messages.filter(m => 
                    m.fromUserId === me.id || m.toUserId === me.id
                ).sort((a, b) => new Date(a.at) - new Date(b.at));
            }
        },

        markChatRead(userId) {
            const db = loadDB();
            const me = this.me();
            if (!me) return;
            let changed = false;
            
            db.messages.forEach(m => {
                if (me.role === 'admin') {
                    // Админ читает сообщения от юзера
                    if (m.fromUserId === userId && m.toUserId === me.id && !m.isRead) {
                        m.isRead = true; changed = true;
                    }
                } else {
                    // Юзер читает сообщения от админа
                    if (m.toUserId === me.id && !m.isRead) {
                        m.isRead = true; changed = true;
                    }
                }
            });
            if (changed) saveDB(db);
        },

        // ---------- СБРОС ----------
        resetAll() {
            if (!confirm('Удалить ВСЕ данные?')) return;
            localStorage.removeItem(DB_KEY);
            localStorage.removeItem(SESSION_KEY);
            window.location.href = 'login.html';
        }
    };
})();