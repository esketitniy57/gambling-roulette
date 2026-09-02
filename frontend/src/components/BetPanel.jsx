import { useState } from 'react';

export default function BetPanel({ bets, placeBet, status }) {
  const [amount, setAmount] = useState(100);

  const colors = [
    { name: 'red', title: 'Красное', multiplier: 'x2', emoji: '🔴' },
    { name: 'black', title: 'Черное', multiplier: 'x2', emoji: '⚫' },
    { name: 'green', title: 'Зеленое', multiplier: 'x14', emoji: '🟢' }
  ];

  const totalBets = (color) => {
    return bets[color].reduce((sum, bet) => sum + bet.amount, 0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {colors.map((color) => (
        <div key={color.name} className="bg-gray-800 rounded-lg p-4">
          {/* Заголовок */}
          <div className="text-center mb-4">
            <h2 className={`text-xl font-bold ${
              color.name === 'red' ? 'text-red-500' : 
              color.name === 'black' ? 'text-gray-300' : 
              'text-green-500'
            }`}>
              {color.emoji} {color.title} ({color.multiplier})
            </h2>
            <p className="text-sm text-gray-400">
              Всего ставок: {totalBets(color.name)} 💰
            </p>
          </div>

          {/* Кнопка ставки */}
          <div className="mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-gray-700 text-white p-2 rounded mb-2"
              min="1"
              disabled={status !== 'betting'}
            />
            <button
              onClick={() => placeBet(color.name, amount)}
              disabled={status !== 'betting'}
              className={`w-full py-2 rounded font-bold transition ${
                status === 'betting'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-600 cursor-not-allowed'
              }`}
            >
              {status === 'betting' ? 'Поставить' : 'Ставки закрыты'}
            </button>
          </div>

          {/* Список ставок */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {bets[color.name].length === 0 ? (
              <p className="text-center text-gray-500 text-sm">Пока нет ставок</p>
            ) : (
              bets[color.name].map((bet, index) => (
                <div key={index} className="flex items-center bg-gray-700 p-2 rounded">
                  <img 
                    src={bet.avatar} 
                    className="w-8 h-8 rounded-full mr-2"
                    alt="avatar"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{bet.username}</p>
                    <p className="text-xs text-yellow-400">{bet.amount} 💰</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
