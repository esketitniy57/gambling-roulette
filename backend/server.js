const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const { PrismaClient } = require('@prisma/client');
const engine = require('./engine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey123',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new SteamStrategy({
  returnURL: (process.env.SITE_URL || 'http://localhost:3000') + '/auth/steam/return',
  realm: (process.env.SITE_URL || 'http://localhost:3000') + '/',
  apiKey: process.env.STEAM_API_KEY || 'your_steam_api_key'
}, async (identifier, profile, done) => {
  try {
    let user = await prisma.user.findUnique({
      where: { steamId: profile.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          steamId: profile.id,
          username: profile.displayName,
          avatar: profile.photos && profile.photos[2] ? profile.photos[2].value : '',
          balance: 500,
          usedDimasPromo: false
        }
      });
    }

    return done(null, user);
  } catch (err) {
    console.error('Steam auth error:', err);
    return done(err);
  }
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
let history = [];

const socketUsers = new Map();

io.on('connection', (socket) => {
  console.log('Подключился: ' + socket.id);

  // Отправляем начальное состояние
  socket.emit('init', {
    roundId: currentRoundId,
    hash: engine.serverSeedHash,
    bets: bets,
    status: roundStatus,
    history: history
  });

  socket.on('login', async (data) => {
    try {
      let user = await prisma.user.findUnique({
        where: { steamId: data.steamId }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            steamId: data.steamId,
            username: data.username,
            avatar: data.avatar,
            balance: 500,
            usedDimasPromo: false
          }
        });
      }

      socketUsers.set(socket.id, user);
      socket.emit('user_data', user);
      console.log('Вход: ' + user.username);
    } catch (err) {
      console.error('Login error:', err);
    }
  });

  socket.on('place_bet', async (data) => {
    const user = socketUsers.get(socket.id);
    if (!user) return socket.emit('error_msg', 'Сначала войди');
    if (roundStatus !== 'betting') return socket.emit('error_msg', 'Ставки закрыты');

    const { color, amount } = data;
    if (!['red', 'black', 'green'].includes(color)) return;
    if (amount <= 0 || amount > user.balance) {
      return socket.emit('error_msg', 'Недостаточно средств');
    }

    try {
      // Транзакция: списываем баланс и создаём ставку
      const updatedUser = await prisma.$transaction(async (tx) => {
        const userDb = await tx.user.findUnique({
          where: { id: user.id },
        });

        if (userDb.balance < amount) {
          throw new Error('Недостаточно средств');
        }

        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: amount } }
        });

        await tx.bet.create({
          data: {
            userId: user.id,
            roundId: currentRoundId,
            color: color,
            amount: amount
          }
        });

        return await tx.user.findUnique({ where: { id: user.id } });
      });

      // Обновляем в памяти и сокете
      user.balance = updatedUser.balance;
      socketUsers.set(socket.id, user);

      bets[color].push({
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        amount: amount
      });

      socket.emit('user_data', user);
      io.emit('new_bet', { color: color, bets: bets });
      console.log(`Ставка: ${user.username} поставил ${amount} на ${color}`);
    } catch (err) {
      console.error('Bet error:', err);
      socket.emit('error_msg', 'Ошибка ставки: ' + err.message);
    }
  });

  socket.on('activate_promo', async (data) => {
    const user = socketUsers.get(socket.id);
    if (!user) return socket.emit('error_msg', 'Сначала войди');

    if (data.code.toLowerCase() !== 'dimas') {
      return socket.emit('promo_error', 'Неверный промокод');
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { 
          id: user.id,
          usedDimasPromo: false 
        },
        data: { 
          balance: { increment: 1000 },
          usedDimasPromo: true 
        }
      });

      user.balance = updatedUser.balance;
      user.usedDimasPromo = true;
      socketUsers.set(socket.id, user);

      socket.emit('promo_success', { newBalance: updatedUser.balance });
      socket.emit('user_data', user);
      console.log('Промокод активирован: ' + user.username);
    } catch (err) {
      if (err.code === 'P2025') {
        socket.emit('promo_error', 'Промокод уже использован');
      } else {
        socket.emit('promo_error', 'Ошибка: ' + err.message);
      }
    }
  });

  socket.on('disconnect', () => {
    socketUsers.delete(socket.id);
  });
});

async function startRound() {
  console.log('=== Начало раунда #' + currentRoundId + ' ===');
  
  bets = { red: [], black: [], green: [] };
  roundStatus = 'betting';

  io.emit('round_start', {
    roundId: currentRoundId,
    hash: engine.serverSeedHash
  });

  setTimeout(async () => {
    console.log('Крутим рулетку...');
    roundStatus = 'spinning';
    io.emit('spinning');

    const clientSeed = Math.random().toString(36).substring(2);
    const result = engine.getRoundResult(engine.serverSeed, clientSeed, currentRoundId);

    console.log(`Выпало: ${result.color} (число ${result.roll})`);

    // Создаём раунд в БД
    await prisma.round.create({
      data: {
        serverSeedHash: engine.serverSeedHash,
        serverSeed: engine.serverSeed,
        clientSeed: clientSeed,
        nonce: currentRoundId,
        winningColor: result.color,
        winningNumber: result.roll,
        status: 'finished'
      }
    });

    const multipliers = { red: 2, black: 2, green: 14 };
    const winMultiplier = multipliers[result.color];

    // Выплачиваем выигрыши
    const winningBets = await prisma.bet.findMany({
      where: {
        roundId: currentRoundId,
        color: result.color
      },
      include: {
        user: true
      }
    });

    for (const bet of winningBets) {
      await prisma.user.update({
        where: { id: bet.userId },
        data: { balance: { increment: bet.amount * winMultiplier } }
      });
      console.log(`Выплата: ${bet.user.username} получил ${bet.amount * winMultiplier}`);
    }

    // Получаем историю последних 20 раундов
    const historyRounds = await prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    history = historyRounds.map(r => ({
      roundId: r.id,
      color: r.winningColor,
      roll: r.winningNumber
    }));

    io.emit('round_end', {
      winningColor: result.color,
      roll: result.roll,
      serverSeed: engine.serverSeed,
      history: history
    });

    // Обновляем балансы всех подключенных пользователей
    for (const [socketId, user] of socketUsers) {
      const freshUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      if (freshUser) {
        user.balance = freshUser.balance;
        socketUsers.set(socketId, user);
        io.to(socketId).emit('user_data', user);
      }
    }

    engine.nextRound();
    currentRoundId++;

    setTimeout(startRound, 5000);
  }, 15000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('✅ Сервер запущен на порту ' + PORT);
  startRound();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});
