import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Roulette from './components/Roulette.jsx';
import BetPanel from './components/BetPanel.jsx';
import PromoModal from './components/PromoModal.jsx';

const socket = io('http://localhost:3000');

export default function App() {
  const [user, setUser] = useState(null);
  const [roundId, setRoundId] = useState(1);
  const [hash, setHash] = useState('');
  const [bets, setBets] = useState({ red: [], black: [], green: [] });
  const [status, setStatus] = useState('betting');
  const [winningColor, setWinningColor] = useState(null);
  const [serverSeed, setServerSeed] = useState('');
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    // Имитация входа (позже заменим на Steam)
    const fakeUser = {
      steamId: 'test123',
      username: 'Player1',
      avatar: 'https://via.placeholder.com/40',
      balance: 500,
      usedDimasPromo: false
    };
    setUser(fakeUser);
    socket.emit('login', fakeUser);

    socket.on('init', (data) => {
      setRoundId(data.roundId);
      setHash(data.hash);
      setBets(data.bets);
      setStatus(data.status);
    });

    socket.on('user_data', (data) => setUser(data));

    socket.on('round_start', (data) => {
      setRoundId(data.roundId);
      setHash(data.hash);
      setBets({ red: [], black: [], green: [] });
      setStatus('betting');
      setWinningColor(null);
      setServerSeed('');
    });

    socket.on('new_bet', (data) => setBets(data.bets));
    socket.on('spinning', () => setStatus('spinning'));

    socket.on('round_end', (data) => {
      setStatus('finished');
      setWinningColor(data.winningColor);
      setServerSeed(data.serverSeed);
    });

    socket.on('promo_success', (data) => {
      alert('Промокод активирован! +1000 монет');
      setShowPromo(false);
    });

    socket.on('promo_error', (msg) => alert('Ошибка: ' + msg));
    socket.on('error_msg', (msg) => alert(msg));

    return () => socket.off();
  }, []);

  const placeBet = (color, amount) => {
    socket.emit('place_bet', { color, amount });
  };

  const activatePromo = (code) => {
    socket.emit('activate_promo', { code });
  };

  return (
    <div className="min-h-screen p-4">
      <header className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg">
        <h1 className="text-2xl font-bold">🎰 ROULETTE</h1>
        {user && (
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-bold">{user.username}</p>
              <p className="text-yellow-400">💰 {user.balance}</p>
            </div>
            <button
              onClick={() => setShowPromo(true)}
              className="bg-purple-600 px-3 py-2 rounded hover:bg-purple-700"
            >
              🎁 Промокод
            </button>
          </div>
        )}
      </header>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-400">Раунд #{roundId}</p>
        <p className="text-xs text-gray-500 break-all">Хеш: {hash}</p>
        {serverSeed && (
          <p className="text-xs text-green-400 break-all">Сид: {serverSeed}</p>
        )}
        <p className="mt-2">
          Статус: <span className="font-bold">{status}</span>
        </p>
      </div>

      <Roulette winningColor={winningColor} status={status} />

      <BetPanel bets={bets} placeBet={placeBet} status={status} />

      {showPromo && (
        <PromoModal
          onClose={() => setShowPromo(false)}
          onActivate={activatePromo}
        />
      )}
    </div>
  );
}
