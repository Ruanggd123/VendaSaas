declare module '@/lib/ai/rulesBot' {
  export class WhatsAppBot {
    constructor();
    public handleMessage(message: string): Promise<string>;
    public reset(): void;
  }
}
