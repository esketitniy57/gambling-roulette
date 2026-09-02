const crypto = require('crypto');

class RouletteEngine {
  constructor() {
    this.serverSeed = this.generateSeed();
    this.serverSeedHash = this.hashSeed(this.serverSeed);
  }

  generateSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  hashSeed(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  getRoundResult(serverSeed, clientSeed, nonce) {
    const combined = serverSeed + ':' + clientSeed + ':' + nonce;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const roll = parseInt(hash.substring(0, 8), 16) % 14;

    let color;
    if (roll === 0) {
      color = 'green';
    } else if (roll >= 1 && roll <= 7) {
      color = 'red';
    } else {
      color = 'black';
    }

    return { roll, color, hash };
  }

  nextRound() {
    this.serverSeed = this.generateSeed();
    this.serverSeedHash = this.hashSeed(this.serverSeed);
    return this.serverSeedHash;
  }
}

module.exports = new RouletteEngine();
