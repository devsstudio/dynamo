import { DynamoCredentials } from "./dynamo-credentials";

export class DynamoConfig {
    region!: string;
    credentials!: DynamoCredentials;
}