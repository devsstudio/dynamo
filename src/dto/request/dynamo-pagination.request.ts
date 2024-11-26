import { Transform, Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { DynamoFilterRequest } from "./dynamo-filter.request";
import { DynamoPaginationDirection } from "../../enums/enums";

export class DynamoPaginationRequest {
    @IsOptional()
    @IsArray()
    @Type(() => (DynamoFilterRequest))
    @ValidateNested()
    filters: DynamoFilterRequest[];

    @IsOptional()
    from?: string = null;

    @IsOptional()
    @IsNumber()
    @Transform((val) => val.value ? val.value * 1 : null)
    limit?: number = null;

    @IsOptional()
    order?: string = null;

    @IsOptional()
    direction?: DynamoPaginationDirection = DynamoPaginationDirection.ASC;
}