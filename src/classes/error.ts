export class DevsStudioDynamoError extends Error {
  httpCode: any;
  constructor(code: any, message: string | undefined) {
    super(message);
    this.httpCode = code;
    this.name = "DevsStudioDynamoError";
  }
}
