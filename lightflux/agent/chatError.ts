export class ChatError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
