import { useState } from 'react';

export default function PromoModal({ onClose, onActivate }) {
  const [code, setCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      onActivate(code.trim());
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-center">🎁 Промокод</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите промокод"
            className="w-full bg-gray-700 text-white p-3 rounded mb-4"
            autoFocus
          />
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded font-bold"
            >
              Активировать
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold"
            >
              Отмена
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          💡 Подсказка: попробуй "dimas" 😉
        </p>
      </div>
    </div>
  );
}
