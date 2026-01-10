import { describe, it, expect } from 'vitest';
import {
    validateCustomerName,
    validateClassName,
    validateOrderNote,
    validatePrice,
    validateStock,
    validateItemName,
    validateEmail,
    sanitizeHtml,
    validateOrderInput,
} from '../../src/utils/validation';

describe('validateCustomerName', () => {
    it('should accept valid Chinese name', () => {
        const result = validateCustomerName('王小明');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('王小明');
    });

    it('should accept valid English name', () => {
        const result = validateCustomerName('John Doe');
        expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
        const result = validateCustomerName('');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('請輸入姓名');
    });

    it('should reject too short name', () => {
        const result = validateCustomerName('A');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('姓名至少需要 2 個字元');
    });

    it('should reject too long name', () => {
        const result = validateCustomerName('A'.repeat(21));
        expect(result.valid).toBe(false);
        expect(result.error).toBe('姓名不能超過 20 個字元');
    });

    it('should reject special characters', () => {
        const result = validateCustomerName('Test<script>');
        expect(result.valid).toBe(false);
    });
});

describe('validateClassName', () => {
    it('should accept valid class name', () => {
        const result = validateClassName('一年二班');
        expect(result.valid).toBe(true);
    });

    it('should accept alphanumeric class', () => {
        const result = validateClassName('1-A');
        expect(result.valid).toBe(true);
    });

    it('should reject empty class', () => {
        const result = validateClassName('');
        expect(result.valid).toBe(false);
    });

    it('should reject too long class name', () => {
        const result = validateClassName('A'.repeat(16));
        expect(result.valid).toBe(false);
    });
});

describe('validateOrderNote', () => {
    it('should accept valid note', () => {
        const result = validateOrderNote('不要辣');
        expect(result.valid).toBe(true);
    });

    it('should accept empty note', () => {
        const result = validateOrderNote('');
        expect(result.valid).toBe(true);
    });

    it('should reject too long note', () => {
        const result = validateOrderNote('A'.repeat(201));
        expect(result.valid).toBe(false);
    });

    it('should sanitize HTML tags', () => {
        const result = validateOrderNote('<script>alert("xss")</script>');
        expect(result.valid).toBe(true);
        expect(result.sanitized).not.toContain('<script>');
    });
});

describe('validatePrice', () => {
    it('should accept valid price', () => {
        const result = validatePrice(100);
        expect(result.valid).toBe(true);
    });

    it('should accept string price', () => {
        const result = validatePrice('50');
        expect(result.valid).toBe(true);
        expect(result.sanitized).toBe('50');
    });

    it('should reject zero price', () => {
        const result = validatePrice(0);
        expect(result.valid).toBe(false);
    });

    it('should reject negative price', () => {
        const result = validatePrice(-10);
        expect(result.valid).toBe(false);
    });

    it('should reject too high price', () => {
        const result = validatePrice(10000);
        expect(result.valid).toBe(false);
    });
});

describe('validateStock', () => {
    it('should accept valid stock', () => {
        const result = validateStock(50);
        expect(result.valid).toBe(true);
    });

    it('should accept zero stock', () => {
        const result = validateStock(0);
        expect(result.valid).toBe(true);
    });

    it('should reject negative stock', () => {
        const result = validateStock(-1);
        expect(result.valid).toBe(false);
    });

    it('should reject too high stock', () => {
        const result = validateStock(10000);
        expect(result.valid).toBe(false);
    });
});

describe('validateItemName', () => {
    it('should accept valid item name', () => {
        const result = validateItemName('雞腿飯');
        expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
        const result = validateItemName('');
        expect(result.valid).toBe(false);
    });

    it('should reject too long name', () => {
        const result = validateItemName('A'.repeat(31));
        expect(result.valid).toBe(false);
    });
});

describe('validateEmail', () => {
    it('should accept valid email', () => {
        const result = validateEmail('test@example.com');
        expect(result.valid).toBe(true);
    });

    it('should reject invalid email', () => {
        const result = validateEmail('invalid-email');
        expect(result.valid).toBe(false);
    });
});

describe('sanitizeHtml', () => {
    it('should escape HTML tags', () => {
        const result = sanitizeHtml('<script>alert("xss")</script>');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should escape quotes', () => {
        const result = sanitizeHtml('"test"');
        expect(result).toBe('&quot;test&quot;');
    });
});

describe('validateOrderInput', () => {
    it('should validate complete order input', () => {
        const result = validateOrderInput({
            customerName: '王小明',
            customerClass: '一年一班',
            note: '不要辣',
        });
        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return all errors', () => {
        const result = validateOrderInput({
            customerName: '',
            customerClass: '',
        });
        expect(result.valid).toBe(false);
        expect(result.errors.customerName).toBeDefined();
        expect(result.errors.customerClass).toBeDefined();
    });
});
