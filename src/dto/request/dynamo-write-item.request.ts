import { IsDefined, IsEnum, IsOptional } from "class-validator";
import { DynamoWriteOperationType } from "../../enums/enums";

export class DynamoWriteItemRequest {

    @IsDefined()
    @IsEnum(DynamoWriteOperationType)
    type!: DynamoWriteOperationType;

    @IsDefined()
    table!: string;

    @IsOptional()
    item?: Record<string, any>;

    @IsOptional()
    key?: Record<string, any>;

    @IsOptional()
    update_expression?: string;

    @IsOptional()
    expression_attribute_names?: Record<string, string>;

    @IsOptional()
    expression_attribute_values?: Record<string, any>;
}


