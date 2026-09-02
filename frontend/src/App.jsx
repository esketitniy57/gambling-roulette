import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Roulette from './components/Roulette.jsx';
import BetPanel from './components/BetPanel.jsx';
import PromoModal from './components/PromoModal.jsx';
import History from './components/History.jsx';

const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin.replace(/:\d+$/, ':3000'));

export default function App() {
  const [user, setUser] = useState(null);
  const [roundId, setRoundId] = useState(1);
  const [hash, setHash] = useState('');
  const [bets, setBets] = useState({ red: [], black: [], green: [] });
  const [status, setStatus] = useState('betting');
  const [winningColor, setWinningColor] = useState(null);
  const [history, setHistory] = useState([]);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const fakeUser = {
      steamId: 'test_' + Math.random().toString(36).substring(7),
      username: 'Player_' + Math.floor(Math.random() * 1000),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + Math.random(),
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
      setHistory(data.history || []);
    });

    socket.on('user_data', (data) => setUser(data));

    socket.on('round_start', (data) => {
      setRoundId(data.roundId);
      setHash(data.hash);
      setBets({ red: [], black: [], green: [] });
      setStatus('betting');
      setWinningColor(null);
    });

    socket.on('new_bet', (data) => setBets(data.bets));
    socket.on('spinning', () => setStatus('spinning'));

    socket.on('round_end', (data) => {
      setStatus('finished');
      setWinningColor(data.winningColor);
      setHistory(data.history || []);
    });

    socket.on('promo_success', (data) => {
      alert('✅ Промокод активирован! +1000 монет');
      setShowPromo(false);
    });

    socket.on('promo_error', (msg) => alert(' Ошибка: ' + msg));
    socket.on('error_msg', (msg) => alert('⚠️ ' + msg));

    return () => socket.off();
  }, []);

  const placeBet = (color, amount) => {
    socket.emit('place_bet', { color, amount });
  };

  const activatePromo = (code) => {
    socket.emit('activate_promo', { code });
  };

  return (
    <div className="min-h-screen p-4 bg-gray-900">
      <header className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-yellow-400">🎰 ROULETTE</h1>
        {user && (
          <div className="flex items-center gap-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full bg-gray-700" />
            <div>
              <p className="font-bold text-white">{user.username}</p>
              <p className="text-yellow-400 font-bold">💰 {user.balance.toFixed(0)}</p>
            </div>
            <button
              onClick={() => setShowPromo(true)}
              className="bg-purple-600 px-3 py-2 rounded hover:bg-purple-700 text-white font-bold"
            >
               Промокод
            </button>
          </div>
        )}
      </header>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-400">Раунд #{roundId}</p>
        <p className="text-xs text-gray-500 break-all px-2">Хеш: {hash}</p>
        <div className="mt-2 inline-block px-4 py-1 rounded-full bg-gray-800">
          <span className="text-gray-400">Статус: </span>
          <span className={`font-bold ${
            status === 'betting' ? 'text-green-400' : 
            status === 'spinning' ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {status === 'betting' ? ' Приём ставок' : 
             status === 'spinning' ? ' Крутится...' : 
             ' Завершён'}
          </span>
        </div>
      </div>

      <Roulette winningColor={winningColor} status={status} />

      <History history={history} />

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
