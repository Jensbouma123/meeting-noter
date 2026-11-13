export class SingleFlight {
  private inFlight: Promise<void> | null = null;

  async run(task: () => Promise<void>): Promise<void> {
    if (this.inFlight !== null) return this.inFlight;
    this.inFlight = task();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  clear(): void {
    this.inFlight = null;
  }
}
