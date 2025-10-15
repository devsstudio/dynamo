export class DynamoPaginationResponse {
    Items: Record<string, any>[];
    Prev?: string = null;
    Next?: string = null;
}