var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Origin: https://github.com/robertgeb/semaphore/blob/main/src/semaphore.ts
export default class Semaphore {
    constructor(max_concurrency_limit = 1, max_throughput_per_timespan = 1, timespan_seconds = 1) {
        this.max_concurrency_limit = max_concurrency_limit;
        this.max_throughput_per_timespan = max_throughput_per_timespan;
        this.timespan_seconds = timespan_seconds;
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
            if (!this.start_time || (this.waiting + this.running == 0 && this.getActualThroughput() < this.max_throughput_per_timespan)) {
                this.start_time = Date.now();
                this.runned = 0;
            }
            this.waiting++;
            while (this.running >= this.max_concurrency_limit || this.getActualThroughput() >= this.max_throughput_per_timespan) {
                yield this.delay(50);
            }
            this.waiting--;
            this.running++;
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getActualThroughput() {
        if (!this.start_time)
            return this.max_throughput_per_timespan;
        let actual_time = Date.now();
        let elapsed_seconds = Number((actual_time - this.start_time)) / 1000 / this.timespan_seconds;
        return (this.runned + this.running) / elapsed_seconds;
    }
}
//# sourceMappingURL=semaphore.js.map