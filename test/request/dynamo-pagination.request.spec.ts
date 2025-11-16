import { validate } from 'class-validator';
import { DynamoPaginationRequest } from '../../src/dto/request/dynamo-pagination.request';
import { DynamoPaginationDirection } from '../../src/enums/enums';
import { DynamoFilterRequest } from '../../src/dto/request/dynamo-filter.request';
import { plainToInstance } from 'class-transformer';

describe('DynamoPaginationRequest', () => {
    it('debería validar correctamente con datos correctos', async () => {

        var paginationRequest = new DynamoPaginationRequest();
        paginationRequest.from = '2020-01-01T00:00:00Z';
        paginationRequest.limit = 10;
        paginationRequest.order = 'createdAt';
        paginationRequest.direction = DynamoPaginationDirection.ASC;
        paginationRequest.filters = [
            {
                attr: "some_field",
                val: "some_value"
            }
        ];

        paginationRequest = plainToInstance(DynamoPaginationRequest, paginationRequest);
        const errors = await validate(paginationRequest, { whitelist: true });
        console.log(JSON.stringify(errors));
        expect(errors.length).toBe(0);
    });

    it('debería fallar la validación si los datos no son válidos', async () => {
        var paginationRequest = new DynamoPaginationRequest();
        // Configura 'paginationRequest' con propiedades inválidas
        paginationRequest.from = 'inicio'; // 'from' debería ser una fecha ISO 8601
        paginationRequest.limit = -5; // 'limit' debería ser un número positivo
        paginationRequest.order = ''; // 'order' no debería estar vacío
        paginationRequest.direction = undefined; // 'direction' debería ser ASC o DESC
        paginationRequest.filters = [new DynamoFilterRequest()]; // 'filters' debería tener filtros válidos

        paginationRequest = plainToInstance(DynamoPaginationRequest, paginationRequest);
        const errors = await validate(paginationRequest, { whitelist: true });
        expect(errors.length).toBeGreaterThan(0);
    });
});