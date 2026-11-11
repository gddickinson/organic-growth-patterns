// numpy-compatible random numbers: the legacy np.random.seed(int) / random_sample() stream (MT19937, 53-bit doubles)
// and np.random.choice([0, 1], size, p=[1 - d, d]), so a browser run with a given seed repeats the Python run exactly.

const N = 624, M = 397;

export class RandomState {
  constructor(seed = 0) { this.mt = new Uint32Array(N); this.seed(seed); }

  // np.random.seed(s): init_genrand, as numpy's mt19937_seed() does for an integer seed.
  seed(s) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, p) + i) >>> 0;
    }
    this.idx = N;
  }

  twist() {
    const mt = this.mt;
    for (let i = 0; i < N; i++) {
      const y = (mt[i] & 0x80000000) | (mt[(i + 1) % N] & 0x7fffffff);
      let v = mt[(i + M) % N] ^ (y >>> 1);
      if (y & 1) v ^= 0x9908b0df;
      mt[i] = v >>> 0;
    }
    this.idx = 0;
  }

  next32() {
    if (this.idx >= N) this.twist();
    let y = this.mt[this.idx++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  // np.random.random_sample(): a 53-bit double in [0, 1).
  random() {
    const a = this.next32() >>> 5, b = this.next32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }

  // np.random.choice([0, 1], size=n, p=[1 - density, density]) as a Float64Array of 0/1.
  // numpy: cdf = p.cumsum(); cdf /= cdf[-1]; idx = cdf.searchsorted(random_sample(n), side='right').
  choiceBinary(n, density) {
    const c0 = 1 - density, c1 = c0 + density, cut = c0 / c1;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = this.random() >= cut ? 1 : 0;
    return out;
  }
}
