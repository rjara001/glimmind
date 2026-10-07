export interface breadcrumb {
  step: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export class FlowTracker {
  private steps: breadcrumb[] = [];

  add(step: string, data?: Record<string, unknown>) {
    this.steps.push({
      step,
      timestamp: Date.now(),
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Evita referencias mutables
    });
  }

  getTrace() {
    return this.steps;
  }
}