const { logger } = require('../utils/custom-logger');

/**
 * Create schema exploration tools
 * @param {Object} hanaClient - HANA client instance
 * @returns {Object} Map of tool names to handler functions
 */
function schemaTools(hanaClient) {
  return {
    /**
     * List all schemas in the database
     */
    hana_list_schemas: {
      description: "List all schemas in the HANA database",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      readOnly: true,
      async handler() {
        try {
          // Using verified query
          const query = `SELECT SCHEMA_NAME FROM SYS.SCHEMAS`;
          const results = await hanaClient.query(query);
          
          const schemas = results.map(row => row.SCHEMA_NAME);
          
          return {
            content: [
              {
                type: "text",
                text: `Available schemas in HANA database:\n\n${schemas.map(schema => `- ${schema}`).join('\n')}\n\nTotal schemas: ${schemas.length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing schemas:', error);
          throw new Error(`Failed to list schemas: ${error.message}`);
        }
      }
    },
    
    /**
     * List all tables in a schema
     */
    hana_list_tables: {
      description: "List all tables in a specific schema",
      inputSchema: {
        type: "object",
        properties: {
          schema_name: {
            type: "string",
            description: "Name of the schema to list tables from"
          }
        },
        required: ["schema_name"]
      },
      readOnly: true,
      async handler(params) {
        try {
          const { schema_name } = params;
          
          if (!schema_name) {
            throw new Error('schema_name parameter is required');
          }
          
          // Using verified query
          const query = `
            SELECT TABLE_NAME
            FROM SYS.TABLES
            WHERE SCHEMA_NAME = ?
          `;
          
          const results = await hanaClient.query(query, [schema_name]);
          
          const tables = results.map(row => row.TABLE_NAME);
          
          return {
            content: [
              {
                type: "text",
                text: `Tables in schema '${schema_name}':\n\n${tables.map(table => `- ${table}`).join('\n')}\n\nTotal tables: ${tables.length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing tables:', error);
          throw new Error(`Failed to list tables: ${error.message}`);
        }
      }
    },
    
    /**
     * Describe a table's structure
     */
    hana_describe_table: {
      description: "Describe the structure of a specific table",
      inputSchema: {
        type: "object",
        properties: {
          schema_name: {
            type: "string",
            description: "Name of the schema containing the table"
          },
          table_name: {
            type: "string",
            description: "Name of the table to describe"
          }
        },
        required: ["schema_name", "table_name"]
      },
      readOnly: true,
      async handler(params) {
        try {
          const { schema_name, table_name } = params;
          
          if (!schema_name) {
            throw new Error('schema_name parameter is required');
          }
          
          if (!table_name) {
            throw new Error('table_name parameter is required');
          }
          
          // Get table columns
          const columnsQuery = `
            SELECT 
              COLUMN_NAME,
              DATA_TYPE_NAME,
              LENGTH,
              SCALE,
              IS_NULLABLE,
              DEFAULT_VALUE,
              POSITION,
              COMMENTS
            FROM 
              SYS.TABLE_COLUMNS
            WHERE 
              SCHEMA_NAME = ?
              AND TABLE_NAME = ?
            ORDER BY 
              POSITION
          `;
          
          const columns = await hanaClient.query(columnsQuery, [schema_name, table_name]);
          
          // Get primary key information
          const pkQuery = `
            SELECT 
              c.COLUMN_NAME
            FROM 
              SYS.CONSTRAINTS cons
              JOIN SYS.CONSTRAINT_COLUMNS c ON cons.SCHEMA_NAME = c.SCHEMA_NAME 
                AND cons.TABLE_NAME = c.TABLE_NAME
                AND cons.CONSTRAINT_NAME = c.CONSTRAINT_NAME
            WHERE 
              cons.SCHEMA_NAME = ?
              AND cons.TABLE_NAME = ?
              AND cons.IS_PRIMARY_KEY = 'TRUE'
            ORDER BY 
              c.POSITION
          `;
          
          const primaryKeys = await hanaClient.query(pkQuery, [schema_name, table_name]);
          const pkColumns = primaryKeys.map(pk => pk.COLUMN_NAME);
          
          const tableInfo = columns.map(col => ({
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE_NAME,
            length: col.LENGTH,
            scale: col.SCALE,
            nullable: col.IS_NULLABLE === 'TRUE',
            default: col.DEFAULT_VALUE,
            position: col.POSITION,
            comment: col.COMMENTS,
            isPrimaryKey: pkColumns.includes(col.COLUMN_NAME)
          }));
          
          const columnsText = tableInfo.map(col => {
            const pk = col.isPrimaryKey ? ' (PK)' : '';
            const nullable = col.nullable ? 'NULL' : 'NOT NULL';
            const defaultVal = col.default ? ` DEFAULT ${col.default}` : '';
            const comment = col.comment ? ` -- ${col.comment}` : '';
            
            return `- ${col.name}: ${col.type}${col.length ? `(${col.length}${col.scale ? `,${col.scale}` : ''})` : ''} ${nullable}${defaultVal}${pk}${comment}`;
          }).join('\n');
          
          return {
            content: [
              {
                type: "text",
                text: `Table structure for '${schema_name}.${table_name}':\n\n${columnsText}\n\nPrimary Keys: ${pkColumns.length > 0 ? pkColumns.join(', ') : 'None'}\nTotal columns: ${tableInfo.length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error describing table:', error);
          throw new Error(`Failed to describe table: ${error.message}`);
        }
      }
    },
    
    /**
     * List all indexes for a table
     */
    hana_list_indexes: {
      description: "List all indexes for a specific table",
      inputSchema: {
        type: "object",
        properties: {
          schema_name: {
            type: "string",
            description: "Name of the schema containing the table"
          },
          table_name: {
            type: "string",
            description: "Name of the table to list indexes for"
          }
        },
        required: ["schema_name", "table_name"]
      },
      readOnly: true,
      async handler(params) {
        try {
          const { schema_name, table_name } = params;
          
          if (!schema_name) {
            throw new Error('schema_name parameter is required');
          }
          
          if (!table_name) {
            throw new Error('table_name parameter is required');
          }
          
          // Using verified query
          const query = `
            SELECT 
              INDEX_NAME, 
              SCHEMA_NAME, 
              TABLE_NAME, 
              INDEX_TYPE
            FROM SYS.INDEXES
            WHERE SCHEMA_NAME = ?
              AND TABLE_NAME = ?
          `;
          
          const results = await hanaClient.query(query, [schema_name, table_name]);
          
          const indexes = results.map(row => ({
            name: row.INDEX_NAME,
            type: row.INDEX_TYPE
          }));
          
          const indexesText = indexes.map(idx => `- ${idx.name} (${idx.type})`).join('\n');
          
          return {
            content: [
              {
                type: "text",
                text: `Indexes for table '${schema_name}.${table_name}':\n\n${indexesText || 'No indexes found'}\n\nTotal indexes: ${indexes.length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing indexes:', error);
          throw new Error(`Failed to list indexes: ${error.message}`);
        }
      }
    },
    
    /**
     * Describe an index in detail
     */
    hana_describe_index: {
      description: "Describe a specific index in detail",
      inputSchema: {
        type: "object",
        properties: {
          schema_name: {
            type: "string",
            description: "Name of the schema containing the table"
          },
          table_name: {
            type: "string",
            description: "Name of the table containing the index"
          },
          index_name: {
            type: "string",
            description: "Name of the index to describe"
          }
        },
        required: ["schema_name", "table_name", "index_name"]
      },
      readOnly: true,
      async handler(params) {
        try {
          const { schema_name, table_name, index_name } = params;
          
          if (!schema_name) {
            throw new Error('schema_name parameter is required');
          }
          
          if (!table_name) {
            throw new Error('table_name parameter is required');
          }
          
          if (!index_name) {
            throw new Error('index_name parameter is required');
          }
          
          // Using verified query with modification to filter by index_name
          const query = `
            SELECT 
              i.INDEX_NAME AS index_name,
              STRING_AGG(ic.COLUMN_NAME, ', ' ORDER BY ic.POSITION) AS column_names,
              CASE 
                  WHEN c.CONSTRAINT_NAME IS NOT NULL AND c.CONSTRAINT_NAME = i.INDEX_NAME THEN 'TRUE'
                  ELSE 'FALSE'
              END AS is_primary,
              CASE 
                  WHEN c.CONSTRAINT_NAME IS NOT NULL THEN 'TRUE'
                  ELSE 'FALSE'
              END AS is_unique
            FROM SYS.INDEXES i
            JOIN SYS.INDEX_COLUMNS ic
              ON i.SCHEMA_NAME = ic.SCHEMA_NAME
             AND i.TABLE_NAME = ic.TABLE_NAME
             AND i.INDEX_NAME = ic.INDEX_NAME
            LEFT JOIN SYS.CONSTRAINTS c
              ON i.SCHEMA_NAME = c.SCHEMA_NAME
             AND i.TABLE_NAME = c.TABLE_NAME
             AND i.INDEX_NAME = c.CONSTRAINT_NAME
            WHERE i.SCHEMA_NAME = ?
              AND i.TABLE_NAME = ?
              AND i.INDEX_NAME = ?
            GROUP BY i.INDEX_NAME, c.CONSTRAINT_NAME
          `;
          
          const results = await hanaClient.query(query, [schema_name, table_name, index_name]);
          
          if (results.length === 0) {
            throw new Error(`Index ${index_name} not found`);
          }
          
          const indexInfo = results[0];
          
          // Get detailed column information
          const columnsQuery = `
            SELECT 
              COLUMN_NAME,
              POSITION,
              ASCENDING_ORDER
            FROM 
              SYS.INDEX_COLUMNS
            WHERE 
              SCHEMA_NAME = ?
              AND TABLE_NAME = ?
              AND INDEX_NAME = ?
            ORDER BY 
              POSITION
          `;
          
          const columns = await hanaClient.query(columnsQuery, [schema_name, table_name, index_name]);
          
          const columnsText = columns.map(col => 
            `- ${col.COLUMN_NAME} (position: ${col.POSITION}, ${col.ASCENDING_ORDER === 'TRUE' ? 'ascending' : 'descending'})`
          ).join('\n');
          
          const properties = [];
          if (indexInfo.IS_PRIMARY === 'TRUE') properties.push('Primary Key');
          if (indexInfo.IS_UNIQUE === 'TRUE') properties.push('Unique');
          
          return {
            content: [
              {
                type: "text",
                text: `Index details for '${index_name}' on table '${schema_name}.${table_name}':\n\n` +
                      `Properties: ${properties.length > 0 ? properties.join(', ') : 'Standard index'}\n` +
                      `Columns: ${indexInfo.COLUMN_NAMES}\n\n` +
                      `Column details:\n${columnsText}\n\n` +
                      `Total columns: ${columns.length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error describing index:', error);
          throw new Error(`Failed to describe index: ${error.message}`);
        }
      }
    }
  };
}

module.exports = schemaTools;
