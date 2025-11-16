export class DynamoPaginationResponse {
    Items!: Record<string, any>[];
    Prev?: string;
    Next?: string;
}