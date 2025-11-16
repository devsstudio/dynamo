import { validate } from 'class-validator';
import { DynamoPaginationOptions } from '../../src/dto/request/dynamo-pagination.options';
import { DevsStudioDynamoError } from '../../src/classes/error';
import { plainToInstance } from 'class-transformer';

describe('DynamoPaginationOptions', () => {
    it('should validate successfully with correct data', async () => {
        var options = new DynamoPaginationOptions();
        options.table = 'test_table';
        options.secret = "S1@n765wozqs52ip32"
        options.definitions = [
            {
                name: "user_code",
                key: true,
                hidden: true,
            },
            {
                name: "contact_code",
                key: false,
            },
            {
                name: "name",
                key: false,
            },
            {
                name: "family_name",
                key: false,
            },
            {
                name: "fullname",
                key: false,
                hidden: true,
            },
            {
                name: "state",
                key: false,
            },
            {
                name: "image",
                key: false,
            },
        ];

        options = plainToInstance(DynamoPaginationOptions, options);

        var errors = await validate(options, { whitelist: true });
        expect(errors.length).toBe(0);
    });

    it('should validate successfully with correct data 2', async () => {

        const payload = {
            "table": "test_table",
            "secret": "S1@n765wozqs52ip32",
            "definitions": [
                {
                    "name": "user_code",
                    "key": true,
                    "hidden": true
                },
                {
                    "name": "contact_code",
                    "key": false
                },
                {
                    "name": "name",
                    "key": false
                },
                {
                    "name": "family_name",
                    "key": false
                },
                {
                    "name": "fullname",
                    "key": false,
                    "hidden": true
                },
                {
                    "name": "state",
                    "key": false
                },
                {
                    "name": "image",
                    "key": false
                }
            ]
        };
        const options = plainToInstance(DynamoPaginationOptions, payload);

        var errors = await validate(options, { whitelist: true });
        expect(errors.length).toBe(0);
    });

    it('should fail validation if required fields are missing', async () => {
        const options = new DynamoPaginationOptions();

        try {
            const errors = await validate(options, { whitelist: true });
            if (errors.length > 0) {
                throw DevsStudioDynamoError.fromValidationErrors(errors);
            }
        } catch (error: any) {
            expect(error).toBeInstanceOf(DevsStudioDynamoError);
            expect(error.httpCode).toBe(400);
            expect(error.message).toContain('table should not be null or undefined');
        }
    });
});