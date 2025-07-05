// Database table and column detection utilities for webhook parameter configuration

import { supabase } from '@/integrations/supabase/client';

export interface DatabaseTable {
  table_name: string;
  columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  description?: string;
}

export interface ParameterSuggestion {
  parameter_name: string;
  parameter_source: string;
  description: string;
  data_type: string;
  table_name: string;
}

// Get all available database tables and their columns
export const getDatabaseTables = async (): Promise<DatabaseTable[]> => {
  try {
    // For now, return predefined tables. In future, this could be enhanced
    // to dynamically fetch from information_schema if needed
    return getPredefinedTables();
  } catch (error) {
    console.error('Error in getDatabaseTables:', error);
    return getPredefinedTables();
  }
};

// Predefined table structures for webhook parameter suggestions
const getPredefinedTables = (): DatabaseTable[] => {
  return [
    {
      table_name: 'subscriptions',
      columns: [
        { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', description: 'Subscription ID' },
        { column_name: 'username', data_type: 'text', is_nullable: false, column_default: null, description: 'Username' },
        { column_name: 'mobile', data_type: 'text', is_nullable: false, column_default: null, description: 'Mobile number' },
        { column_name: 'email', data_type: 'text', is_nullable: true, column_default: null, description: 'Email address' },
        { column_name: 'status', data_type: 'text', is_nullable: false, column_default: "'pending'", description: 'Subscription status' },
        { column_name: 'data_limit_gb', data_type: 'integer', is_nullable: false, column_default: null, description: 'Data limit in GB' },
        { column_name: 'duration_days', data_type: 'integer', is_nullable: false, column_default: null, description: 'Duration in days' },
        { column_name: 'price_toman', data_type: 'integer', is_nullable: false, column_default: null, description: 'Price in Toman' },
        { column_name: 'expire_at', data_type: 'timestamp', is_nullable: true, column_default: null, description: 'Expiration date' },
        { column_name: 'subscription_url', data_type: 'text', is_nullable: true, column_default: null, description: 'Subscription URL' },
        { column_name: 'protocol', data_type: 'text', is_nullable: true, column_default: "'vmess'", description: 'VPN protocol' },
        { column_name: 'plan_id', data_type: 'uuid', is_nullable: true, column_default: null, description: 'Associated plan ID' },
        { column_name: 'receipt_image_url', data_type: 'text', is_nullable: true, column_default: null, description: 'Receipt image URL' },
        { column_name: 'admin_decision', data_type: 'text', is_nullable: true, column_default: null, description: 'Admin approval decision' },
        { column_name: 'created_at', data_type: 'timestamp', is_nullable: false, column_default: 'now()', description: 'Creation timestamp' },
        { column_name: 'updated_at', data_type: 'timestamp', is_nullable: false, column_default: 'now()', description: 'Last update timestamp' }
      ]
    },
    {
      table_name: 'subscription_plans',
      columns: [
        { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', description: 'Plan ID' },
        { column_name: 'name_en', data_type: 'text', is_nullable: false, column_default: null, description: 'Plan name (English)' },
        { column_name: 'name_fa', data_type: 'text', is_nullable: false, column_default: null, description: 'Plan name (Persian)' },
        { column_name: 'description_en', data_type: 'text', is_nullable: true, column_default: null, description: 'Plan description (English)' },
        { column_name: 'description_fa', data_type: 'text', is_nullable: true, column_default: null, description: 'Plan description (Persian)' },
        { column_name: 'price_per_gb', data_type: 'integer', is_nullable: false, column_default: null, description: 'Price per GB' },
        { column_name: 'default_data_limit_gb', data_type: 'integer', is_nullable: false, column_default: '10', description: 'Default data limit' },
        { column_name: 'default_duration_days', data_type: 'integer', is_nullable: false, column_default: '30', description: 'Default duration' },
        { column_name: 'is_active', data_type: 'boolean', is_nullable: false, column_default: 'true', description: 'Active status' },
        { column_name: 'assigned_panel_id', data_type: 'uuid', is_nullable: true, column_default: null, description: 'Assigned panel ID' }
      ]
    },
    {
      table_name: 'panel_servers',
      columns: [
        { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', description: 'Panel ID' },
        { column_name: 'name', data_type: 'text', is_nullable: false, column_default: null, description: 'Panel name' },
        { column_name: 'type', data_type: 'text', is_nullable: false, column_default: null, description: 'Panel type (marzban/marzneshin)' },
        { column_name: 'panel_url', data_type: 'text', is_nullable: false, column_default: null, description: 'Panel URL' },
        { column_name: 'country_en', data_type: 'text', is_nullable: false, column_default: null, description: 'Country (English)' },
        { column_name: 'country_fa', data_type: 'text', is_nullable: false, column_default: null, description: 'Country (Persian)' },
        { column_name: 'is_active', data_type: 'boolean', is_nullable: false, column_default: 'true', description: 'Active status' },
        { column_name: 'health_status', data_type: 'text', is_nullable: true, column_default: "'unknown'", description: 'Health status' }
      ]
    },
    {
      table_name: 'test_users',
      columns: [
        { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', description: 'Test user ID' },
        { column_name: 'username', data_type: 'text', is_nullable: false, column_default: null, description: 'Username' },
        { column_name: 'email', data_type: 'text', is_nullable: false, column_default: null, description: 'Email address' },
        { column_name: 'phone_number', data_type: 'text', is_nullable: false, column_default: null, description: 'Phone number' },
        { column_name: 'panel_name', data_type: 'text', is_nullable: false, column_default: null, description: 'Panel name' },
        { column_name: 'subscription_url', data_type: 'text', is_nullable: true, column_default: null, description: 'Subscription URL' },
        { column_name: 'data_limit_bytes', data_type: 'bigint', is_nullable: false, column_default: '1073741824', description: 'Data limit in bytes' },
        { column_name: 'expire_date', data_type: 'timestamp', is_nullable: false, column_default: null, description: 'Expiration date' },
        { column_name: 'status', data_type: 'text', is_nullable: true, column_default: "'active'", description: 'Status' }
      ]
    },
    {
      table_name: 'payment_logs',
      columns: [
        { column_name: 'id', data_type: 'uuid', is_nullable: false, column_default: 'gen_random_uuid()', description: 'Payment log ID' },
        { column_name: 'subscription_id', data_type: 'uuid', is_nullable: true, column_default: null, description: 'Related subscription ID' },
        { column_name: 'operation_type', data_type: 'text', is_nullable: false, column_default: null, description: 'Payment operation type' },
        { column_name: 'success', data_type: 'boolean', is_nullable: true, column_default: 'false', description: 'Success status' },
        { column_name: 'status_code', data_type: 'integer', is_nullable: true, column_default: null, description: 'HTTP status code' },
        { column_name: 'error_message', data_type: 'text', is_nullable: true, column_default: null, description: 'Error message' },
        { column_name: 'created_at', data_type: 'timestamp', is_nullable: false, column_default: 'now()', description: 'Creation timestamp' }
      ]
    }
  ];
};

// Get parameter suggestions based on webhook trigger type
export const getParameterSuggestions = (triggerType?: string): ParameterSuggestion[] => {
  const allTables = getPredefinedTables();
  const suggestions: ParameterSuggestion[] = [];

  // Common parameters for all webhook types
  const commonParams: ParameterSuggestion[] = [
    {
      parameter_name: 'webhook_type',
      parameter_source: 'webhook_type',
      description: 'Type of webhook trigger',
      data_type: 'text',
      table_name: 'system'
    },
    {
      parameter_name: 'timestamp',
      parameter_source: 'created_at',
      description: 'Webhook trigger timestamp',
      data_type: 'timestamp',
      table_name: 'system'
    }
  ];

  suggestions.push(...commonParams);

  // Add table-specific suggestions
  allTables.forEach(table => {
    table.columns.forEach(column => {
      if (shouldIncludeColumn(column.column_name, triggerType, table.table_name)) {
        suggestions.push({
          parameter_name: `${table.table_name}.${column.column_name}`,
          parameter_source: column.column_name,
          description: column.description || `${column.column_name} from ${table.table_name}`,
          data_type: column.data_type,
          table_name: table.table_name
        });
      }
    });
  });

  return suggestions;
};

// Determine if a column should be included based on webhook trigger type
const shouldIncludeColumn = (columnName: string, triggerType?: string, tableName?: string): boolean => {
  // Always include these common columns
  const alwaysInclude = ['id', 'username', 'email', 'mobile', 'phone_number', 'name', 'status', 'created_at', 'updated_at'];
  
  if (alwaysInclude.includes(columnName)) {
    return true;
  }

  // Include based on trigger type
  if (triggerType) {
    switch (triggerType) {
      case 'subscription_creation':
      case 'manual_payment_approval':
        return ['subscriptions', 'subscription_plans', 'panel_servers'].includes(tableName || '');
      
      case 'test_account_creation':
        return ['test_users', 'panel_servers'].includes(tableName || '');
      
      case 'stripe_payment_success':
      case 'zarinpal_payment_success':
        return ['subscriptions', 'payment_logs'].includes(tableName || '');
      
      default:
        return true;
    }
  }

  return true;
};

// Generate sample data for webhook payload preview
export const generateSampleData = (parameterSource: string, dataType: string): any => {
  const sampleValues: Record<string, any> = {
    // IDs
    'id': 'uuid-12345-example',
    'subscription_id': 'sub-12345-example',
    'plan_id': 'plan-12345-example',
    'panel_id': 'panel-12345-example',
    'test_user_id': 'test-12345-example',
    
    // User data
    'username': 'sample_user_123',
    'mobile': '09123456789',
    'email': 'user@example.com',
    'phone_number': '09123456789',
    
    // Plan/Panel data
    'name': 'Sample Service',
    'name_en': 'Premium Plan',
    'name_fa': 'پلن پریمیوم',
    'panel_name': 'Germany Server 1',
    'panel_type': 'marzban',
    'panel_url': 'https://panel.example.com',
    'country_en': 'Germany',
    'country_fa': 'آلمان',
    
    // Subscription data
    'status': 'active',
    'data_limit_gb': 50,
    'duration_days': 30,
    'price_toman': 250000,
    'protocol': 'vmess',
    'subscription_url': 'vmess://eyJ2IjoiMiIsInBzIjoi...',
    
    // Payment data
    'payment_method': 'manual_transfer',
    'receipt_url': 'https://storage.example.com/receipt.jpg',
    'approve_link': 'https://admin.example.com/approve/12345',
    'reject_link': 'https://admin.example.com/reject/12345',
    
    // Timestamps
    'created_at': new Date().toISOString(),
    'updated_at': new Date().toISOString(),
    'expire_at': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    
    // Booleans
    'is_active': true,
    'is_enabled': true,
    'is_free_trial': true,
    'success': true,
    
    // System data
    'webhook_type': 'subscription_creation',
    'trigger_type': 'subscription_creation'
  };

  // Return specific sample value if available
  if (sampleValues[parameterSource]) {
    return sampleValues[parameterSource];
  }

  // Generate based on data type
  switch (dataType) {
    case 'integer':
    case 'bigint':
      return Math.floor(Math.random() * 1000) + 1;
    case 'boolean':
      return true;
    case 'timestamp':
    case 'timestamptz':
      return new Date().toISOString();
    case 'uuid':
      return 'uuid-' + Math.random().toString(36).substr(2, 9);
    default:
      return `sample_${parameterSource}`;
  }
};