const { validateQuery } = require('../src/utils/security');

describe('Security Validation', () => {
  describe('validateQuery', () => {
    test('should allow valid SELECT queries', () => {
      const validQueries = [
        'SELECT * FROM DUMMY',
        'SELECT SCHEMA_NAME FROM SYS.SCHEMAS',
        'SELECT TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = ?',
        'SELECT COUNT(*) FROM "SCHEMA"."TABLE"',
        `SELECT 
          INDEX_NAME, 
          SCHEMA_NAME, 
          TABLE_NAME, 
          INDEX_TYPE
        FROM SYS.INDEXES
        WHERE SCHEMA_NAME = ?
          AND TABLE_NAME = ?`
      ];
      
      validQueries.forEach(query => {
        expect(() => validateQuery(query)).not.toThrow();
      });
    });
    
    test('should reject data modification queries', () => {
      const invalidQueries = [
        'INSERT INTO TABLE VALUES (1, 2, 3)',
        'UPDATE TABLE SET col = 1 WHERE id = 2',
        'DELETE FROM TABLE WHERE id = 1',
        'TRUNCATE TABLE mytable',
        'DROP TABLE mytable',
        'ALTER TABLE mytable ADD COLUMN newcol INT',
        'CREATE TABLE newtable (id INT)',
        'GRANT SELECT ON mytable TO user',
        'REVOKE SELECT ON mytable FROM user',
        'MERGE INTO target USING source ON (target.id = source.id) WHEN MATCHED THEN UPDATE SET target.col = source.col',
        'EXEC my_procedure',
        'CALL my_procedure()'
      ];
      
      invalidQueries.forEach(query => {
        expect(() => validateQuery(query)).toThrow();
      });
    });
    
    test('should reject multiple statements', () => {
      const multipleStatements = [
        'SELECT * FROM DUMMY; SELECT * FROM ANOTHER',
        'SELECT * FROM DUMMY; DROP TABLE secret'
      ];
      
      multipleStatements.forEach(query => {
        expect(() => validateQuery(query)).toThrow();
      });
    });
    
    test('should allow semicolons in strings', () => {
      const query = "SELECT * FROM DUMMY WHERE text = 'This has a ; semicolon'";
      expect(() => validateQuery(query)).not.toThrow();
    });
  });
});
