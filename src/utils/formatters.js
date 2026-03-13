/**
 * Response formatting utilities for HANA MCP Server
 */

const { logger } = require('./logger');

class Formatters {
  /**
   * Create a standard MCP CallToolResult-style response
   */
  static createResponse(text, type = 'text', structuredContent = undefined, isError = false) {
    const result = {
      content: [
        {
          type,
          text
        }
      ]
    };

    if (structuredContent !== undefined) {
      result.structuredContent = structuredContent;
    }

    if (isError) {
      result.isError = true;
    }

    return result;
  }

  /**
   * Helper to create a purely structured response with a JSON preview in text
   */
  static createStructuredResponse(structured, previewTitle = 'Result', isError = false) {
    const preview = `${previewTitle}:\n\n${JSON.stringify(structured, null, 2)}`;
    return {
      content: [
        {
          type: 'text',
          text: preview
        }
      ],
      structuredContent: structured,
      ...(isError ? { isError: true } : {})
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(message, details = '') {
    const text = details ? `${message}\n\n${details}` : message;
    return this.createResponse(`❌ ${text}`, 'text', undefined, true);
  }

  /**
   * Create a success response
   */
  static createSuccessResponse(message, details = '') {
    const text = details ? `${message}\n\n${details}` : message;
    return this.createResponse(`✅ ${text}`);
  }

  /**
   * Format configuration display
   */
  static formatConfig(config) {
    const lines = [
      'HANA Configuration:',
      '',
      `Host: ${config.host}`,
      `Port: ${config.port}`,
      `User: ${config.user}`,
      `Password: ${config.password}`,
      `Schema: ${config.schema}`,
      `SSL: ${config.ssl}`,
      ''
    ];

    const status = (config.host !== 'NOT SET' && config.user !== 'NOT SET' && config.password !== 'NOT SET') 
      ? 'PROPERLY CONFIGURED' 
      : 'MISSING REQUIRED VALUES';

    lines.push(`Status: ${status}`);
    
    return lines.join('\n');
  }

  /**
   * Format environment variables display
   */
  static formatEnvironmentVars(envVars) {
    const lines = [
      '🔧 Environment Variables:',
      ''
    ];

    for (const [key, value] of Object.entries(envVars)) {
      lines.push(`${key}: ${value}`);
    }

    lines.push('');
    lines.push('Mode: Real HANA Connection');
    
    return lines.join('\n');
  }

  /**
   * Format schema list
   */
  static formatSchemaList(schemas) {
    const lines = [
      '📋 Available schemas in HANA database:',
      ''
    ];

    schemas.forEach(schema => {
      lines.push(`- ${schema}`);
    });

    lines.push('');
    lines.push(`Total schemas: ${schemas.length}`);
    
    return lines.join('\n');
  }

  /**
   * Format table list
   */
  static formatTableList(tables, schemaName) {
    const lines = [
      `📋 Tables in schema '${schemaName}':`,
      ''
    ];

    tables.forEach(table => {
      lines.push(`- ${table}`);
    });

    lines.push('');
    lines.push(`Total tables: ${tables.length}`);
    
    return lines.join('\n');
  }

  /**
   * Format table structure
   */
  static formatTableStructure(columns, schemaName, tableName) {
    const lines = [
      `📋 Table structure for '${schemaName}.${tableName}':`,
      ''
    ];

    if (columns.length === 0) {
      lines.push('No columns found.');
      return lines.join('\n');
    }

    // Create header
    const header = 'Column Name          | Data Type    | Length | Nullable | Default | Description';
    const separator = '---------------------|--------------|--------|----------|---------|-------------';
    
    lines.push(header);
    lines.push(separator);

    // Add columns
    columns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'TRUE' ? 'YES' : 'NO';
      const defaultValue = col.DEFAULT_VALUE || '-';
      const description = col.COMMENTS || '-';
      const dataType = col.DATA_TYPE_NAME + 
        (col.LENGTH ? `(${col.LENGTH})` : '') + 
        (col.SCALE ? `,${col.SCALE}` : '');
      
      const line = `${col.COLUMN_NAME.padEnd(20)} | ${dataType.padEnd(12)} | ${(col.LENGTH || '-').toString().padEnd(6)} | ${nullable.padEnd(8)} | ${defaultValue.padEnd(8)} | ${description}`;
      lines.push(line);
    });

    lines.push('');
    lines.push(`Total columns: ${columns.length}`);
    
    return lines.join('\n');
  }

  /**
   * Format index list
   */
  static formatIndexList(indexMap, schemaName, tableName) {
    const lines = [
      `📋 Indexes for table '${schemaName}.${tableName}':`,
      ''
    ];

    if (Object.keys(indexMap).length === 0) {
      lines.push('No indexes found.');
      return lines.join('\n');
    }

    Object.entries(indexMap).forEach(([indexName, index]) => {
      const type = index.isUnique ? 'Unique' : index.type;
      const columns = index.columns.join(', ');
      lines.push(`- ${indexName} (${type}) - Columns: ${columns}`);
    });

    lines.push('');
    lines.push(`Total indexes: ${Object.keys(indexMap).length}`);
    
    return lines.join('\n');
  }

  /**
   * Format index details
   */
  static formatIndexDetails(results, schemaName, tableName, indexName) {
    if (results.length === 0) {
      return `❌ Index '${schemaName}.${tableName}.${indexName}' not found.`;
    }

    const indexInfo = results[0];
    const columns = results.map(row => `${row.COLUMN_NAME} (${row.SORT_ORDER || row.ORDER || 'ASC'})`).join(', ');

    const lines = [
      `📋 Index details for '${schemaName}.${tableName}.${indexName}':`,
      '',
      `Index Name: ${indexInfo.INDEX_NAME}`,
      `Table: ${schemaName}.${tableName}`,
      `Type: ${indexInfo.INDEX_TYPE}`,
      `Unique: ${(indexInfo.IS_UNIQUE === 'TRUE' || (indexInfo.INDEX_TYPE || '').toUpperCase().includes('UNIQUE')) ? 'Yes' : 'No'}`,
      `Columns: ${columns}`,
      `Total columns: ${results.length}`
    ];

    return lines.join('\n');
  }

  /**
   * Format query results as table
   */
  static formatQueryResults(results, query) {
    const lines = [
      '🔍 Query executed successfully:',
      '',
      `Query: ${query}`,
      ''
    ];

    if (results.length === 0) {
      lines.push('Query executed successfully but returned no results.');
      return lines.join('\n');
    }

    // Format as markdown table
    const columns = Object.keys(results[0]);
    const header = `| ${columns.join(' | ')} |`;
    const separator = `| ${columns.map(() => '---').join(' | ')} |`;
    const rows = results.map(row => 
      `| ${columns.map(col => String(row[col] || '')).join(' | ')} |`
    ).join('\n');

    lines.push(`Results (${results.length} rows):`);
    lines.push(header);
    lines.push(separator);
    lines.push(rows);
    
    return lines.join('\n');
  }

  /**
   * Format connection test result
   */
  static formatConnectionTest(config, success, error = null, testResult = null) {
    if (!success) {
      const lines = [
        '❌ Connection test failed!',
        ''
      ];

      if (error) {
        lines.push(`Error: ${error}`);
        lines.push('');
      }

      lines.push('Please check your HANA database configuration and ensure the database is accessible.');
      lines.push('');
      lines.push('Configuration:');
      lines.push(`- Host: ${config.host}`);
      lines.push(`- Port: ${config.port}`);
      lines.push(`- User: ${config.user}`);
      lines.push(`- Schema: ${config.schema || 'default'}`);
      lines.push(`- SSL: ${config.ssl ? 'enabled' : 'disabled'}`);

      return lines.join('\n');
    }

    const lines = [
      '✅ Connection test successful!',
      '',
      'Configuration looks good:',
      `- Host: ${config.host}`,
      `- Port: ${config.port}`,
      `- User: ${config.user}`,
      `- Schema: ${config.schema || 'default'}`,
      `- SSL: ${config.ssl ? 'enabled' : 'disabled'}`
    ];

    if (testResult) {
      lines.push('');
      lines.push(`Test query result: ${testResult}`);
    }

    return lines.join('\n');
  }
}

module.exports = Formatters; 