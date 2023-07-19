export class DevsStudioDynamoError extends Error {
  httpCode;
  constructor(code: any, message: string | undefined) {
    super(message);
    this.httpCode = code;
    this.name = "DevsStudioDynamoError";
  }
}
