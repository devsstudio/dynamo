import { ArrayMinSize, IsArray, IsDefined, IsOptional, IsString, ValidateNested } from "class-validator";
import { DynamoPaginationDefinition } from "./dynamo-pagination.definition";
import { Type } from "class-transformer";

export class DynamoPaginationOptions {
    @IsDefined()
    @IsString()
    table!: string;

    @IsDefined()
    @Type(() => (DynamoPaginationDefinition))
    @ValidateNested()
    @IsArray()
    @ArrayMinSize(1)
    definitions!: DynamoPaginationDefinition[];

    @IsOptional()
    @IsString()
    index?: string;

    @IsOptional()
    @IsString()
    secret?: string;
}