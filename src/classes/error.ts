import { ValidationError } from "class-validator";

export class DevsStudioDynamoError extends Error {
  httpCode: any;
  constructor(code: any, message: string | undefined) {
    super(message);
    this.httpCode = code;
    this.name = "DevsStudioDynamoError";
  }

  static fromValidationErrors(errors: ValidationError[]) {
    for (let error of errors) {
      if (error.constraints) {
        for (let [key, value] of Object.entries(error.constraints)) {
          return new DevsStudioDynamoError(400, value);
        }
      }
    }
    return new DevsStudioDynamoError(400, "unknown validation error");
  }
}
