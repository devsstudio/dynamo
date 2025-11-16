import { Transform, Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";
import { DynamoFilterRequest } from "./dynamo-filter.request";
import { DynamoPaginationDirection } from "../../enums/enums";

export class DynamoPaginationRequest {
    @IsOptional()
    @IsArray()
    @Type(() => (DynamoFilterRequest))
    @ValidateNested()
    filters!: DynamoFilterRequest[];

    @IsOptional()
    @IsString()
    from?: string;

    @IsOptional()
    @IsInt()
    @IsPositive()
    @Transform((val) => val.value ? val.value * 1 : null)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    order?: string;

    @IsOptional()
    @IsEnum(DynamoPaginationDirection)
    direction?: DynamoPaginationDirection = DynamoPaginationDirection.ASC;
}