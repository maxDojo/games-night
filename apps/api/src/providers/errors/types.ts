export interface ErrorCaptureContext {
  tags?: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, unknown>;
}

export interface ErrorProvider {
  readonly name: string;
  readonly enabled: boolean;
  captureException(error: unknown, context?: ErrorCaptureContext): Promise<void>;
}
