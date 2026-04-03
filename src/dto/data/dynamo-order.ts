export type DynamoOrderDirection = 'ASC' | 'DESC';

export class DynamoOrder {
    field!: string;
    direction?: DynamoOrderDirection;
}
