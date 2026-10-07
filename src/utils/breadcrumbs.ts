export interface Breadcrumb {
  step: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export class FlowTracker {
  private steps: Breadcrumb[] = [];

  add(step: string, data?: Record<string, unknown>) {
    this.steps.push({
      step,
      timestamp: Date.now(),
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    });
  }

  getTrace(): Breadcrumb[] {
    return this.steps;
  }

  clear() {
    this.steps = [];
  }
}