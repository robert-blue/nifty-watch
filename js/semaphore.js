const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
  return new (P || (P = Promise))((resolve, reject) => {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

export default class Semaphore {
  constructor(max_concurrency_limit = 1, max_throughput_per_second = 1) {
    this.max_concurrency_limit = max_concurrency_limit;
    this.max_throughput_per_second = max_throughput_per_second;
    this.running = 0;
    this.runned = 0;
    this.waiting = 0;
  }

  release() {
    this.running--;
    this.runned++;
  }

  wait() {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.start_time || (this.waiting + this.running == 0 && this.getActualThroughput() < this.max_throughput_per_second)) {
        this.start_time = Date.now();
        this.runned = 0;
      }
      this.waiting++;
      while (this.running >= this.max_concurrency_limit || this.getActualThroughput() >= this.max_throughput_per_second) {
        yield this.delay(50);
      }
      this.waiting--;
      this.running++;
    });
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getActualThroughput() {
    if (!this.start_time) return this.max_throughput_per_second;
    const actual_time = Date.now();
    const elapsed_seconds = Number(actual_time - this.start_time) / 1000;
    return (this.runned + this.running) / elapsed_seconds;
  }
}
