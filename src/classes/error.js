class DevsStudioDynamoError extends Error {
  httpCode;
  constructor(code, message) {
    super(message);
    this.httpCode = code;
    this.name = "DevsStudioDynamoError";
  }
}

exports.DevsStudioDynamoError = DevsStudioDynamoError;
