type JobHandler = () => Promise<void>;

const queue: Array<{ name: string; run: JobHandler }> = [];
let processing = false;

export function enqueueJob(name: string, run: JobHandler) {
  queue.push({ name, run });
  void drainQueue();
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;
    try {
      await job.run();
    } catch (error) {
      console.error(`Job failed: ${job.name}`, error);
    }
  }

  processing = false;
}
