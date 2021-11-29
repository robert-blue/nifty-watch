// Origin: https://github.com/robertgeb/semaphore/blob/main/src/semaphore.ts
export default class Semaphore {
    private max_throughput_per_timespan: number;
    private max_concurrency_limit: number;
    private timespan_seconds: number;
    private running: number;
    private runned: number;
    private waiting: number;
    private start_time?: number;

    constructor(max_concurrency_limit: number=1, max_throughput_per_timespan = 1, timespan_seconds = 1) {
        this.max_concurrency_limit = max_concurrency_limit;
        this.max_throughput_per_timespan = max_throughput_per_timespan;
        this.timespan_seconds = timespan_seconds;
        this.running = 0;
        this.runned = 0;
        this.waiting = 0;
    }

    release()
    {
        this.running--;
        this.runned++;
    }

    async wait()
    {
        if(!this.start_time || (this.waiting + this.running == 0 && this.getActualThroughput() < this.max_throughput_per_timespan)){
            this.start_time = Date.now();
            this.runned = 0
        }
        this.waiting++;
        while(this.running >= this.max_concurrency_limit || this.getActualThroughput() >= this.max_throughput_per_timespan)
        {
            await this.delay(50);
        }
        this.waiting--;
        this.running++;
    }

    delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    getActualThroughput()
    {
        if(!this.start_time)
            return this.max_throughput_per_timespan;
        let actual_time = Date.now();
        let elapsed_seconds = Number((actual_time - this.start_time)) / 1000 / this.timespan_seconds;
        return (this.runned + this.running)/elapsed_seconds;
    }
}
