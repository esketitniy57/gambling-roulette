const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const engine = require('./engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Сессии
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey123',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Steam авторизация
passport.use(new SteamStrategy({
  returnURL: (process.env.SITE_URL || 'http://localhost:3000') + '/auth/steam/return',
  realm: (process.env.SITE_URL || 'http://localhost:3000') + '/',
  apiKey: process.env.STEAM_API_KEY || 'your_steam_api_key'
}, (identifier, profile, done) => {
  const user = {
    steamId: profile.id,
    username: profile.displayName,
    avatar: profile.photos && profile.photos[2] ? profile.photos[2].value : ''
  };
  return done(null, user);
}));

app.get('/auth/steam', passport.authenticate('steam'));
app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Игровое состояние
let currentRoundId = 1;
let bets = { red: [], black: [], green: [] };
let roundStatus = 'betting';

// Временное хранилище пользователей (пока нет БД)
let users = {};

// Функция: получить или создать пользователя
function getOrCreateUser(steamId, username, avatar) {
  if (!users[steamId]) {
    users[steamId] = {
      steamId,
      username,
      avatar,
      balance: 0,
      usedDimasPromo: false
    };
  }
  return users[steamId];
}

// Вебсокеты
io.on('connection', (socket) => {
  console.log('Подключился: ' + socket.id);

  socket.emit('init', {
    roundId: currentRoundId,
    hash: engine.serverSeedHash,
    bets: bets,
    status: roundStatus
  });

  // Авторизация через Steam (упрощённая для сокета)
  socket.on('login', (data) => {
    const user = getOrCreateUser(data.steamId, data.username, data.avatar);
    socket.data.user = user;
    socket.emit('user_data', user);
  });

  // Ставка
  socket.on('place_bet', (data) => {
    const user = socket.data.user;
    if (!user) return socket.emit('error_msg', 'Сначала войди через Steam');
    if (roundStatus !== 'betting') return socket.emit('error_msg', 'Ставки закрыты');

    const { color, amount } = data;
    if (!['red', 'black', 'green'].includes(color)) return;
    if (amount <= 0 || amount > user.balance) return socket.emit('error_msg', 'Недостаточно средств');

    user.balance -= amount;
    bets[color].push({
      username: user.username,
      avatar: user.avatar,
      amount: amount
    });

    socket.emit('user_data', user);
    io.emit('new_bet', { color: color, bets: bets });
  });

  // Промокод
  socket.on('activate_promo', (data) => {
    const user = socket.data.user;
    if (!user) return socket.emit('error_msg', 'Сначала войди через Steam');

    if (data.code.toLowerCase() !== 'dimas') {
      return socket.emit('promo_error', 'Неверный промокод');
    }
    if (user.usedDimasPromo) {
      return socket.emit('promo_error', 'Уже использован');
    }

    user.balance += 1000;
    user.usedDimasPromo = true;
    socket.emit('promo_success', { newBalance: user.balance });
    socket.emit('user_data', user);
  });
});

// Игровой цикл
function startRound() {
  bets = { red: [], black: [], green: [] };
  roundStatus = 'betting';

  io.emit('round_start', {
    roundId: currentRoundId,
    hash: engine.serverSeedHash
  });

  // 15 секунд на ставки
  setTimeout(() => {
    roundStatus = 'spinning';
    io.emit('spinning');

    const clientSeed = Math.random().toString(36).substring(2);
    const result = engine.getRoundResult(engine.serverSeed, clientSeed, currentRoundId);

    const multipliers = { red: 2, black: 2, green: 14 };
    const winMultiplier = multipliers[result.color];

    // Выплаты
    const winners = bets[result.color] || [];
    for (const bet of winners) {
      for (const key in users) {
        if (users[key].username === bet.username) {
          users[key].balance += bet.amount * winMultiplier;
        }
      }
    }

    io.emit('round_end', {
      winningColor: result.color,
      roll: result.roll,
      serverSeed: engine.serverSeed
    });

    engine.nextRound();
    currentRoundId++;

    // Пауза 5 секунд и новый раунд
    setTimeout(startRound, 5000);
  }, 15000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Сервер запущен на порту ' + PORT);
  startRound();
});
