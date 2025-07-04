// Telegram Bot API Service for b.bnets.co integration
// Uses GET method with JSON body as required by the API

const BASE_URL = 'https://b.bnets.co/api';
const API_TOKEN = '6169452dd5a55778f35fcedaa1fbd7b9';

interface TelegramApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper function to make GET requests with JSON body
async function makeApiCall<T = any>(endpoint: string, payload: Record<string, any>): Promise<TelegramApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error(`Telegram Bot API Error (${endpoint}):`, error);
    return { 
      success: false, 
      error: error.message || 'API request failed',
      data: null 
    };
  }
}

// User Management APIs
export const telegramBotApi = {
  // Get all users
  async getAllUsers(limit: number = 50) {
    return makeApiCall('/users', {
      actions: 'users',
      limit
    });
  },

  // Get user by chat ID
  async getUserById(chatId: string) {
    return makeApiCall('/users', {
      actions: 'user',
      chat_id: chatId
    });
  },

  // Add new user
  async addUser(chatId: string) {
    return makeApiCall('/users', {
      actions: 'user_add',
      chat_id: chatId
    });
  },

  // Get all invoices
  async getAllInvoices(limit: number = 50, page: number = 1) {
    return makeApiCall('/invoice', {
      actions: 'invoices',
      limit,
      page
    });
  },

  // Get invoice by username
  async getInvoiceByUsername(username: string) {
    return makeApiCall('/invoice', {
      actions: 'invoice',
      username
    });
  },

  // Add new invoice
  async addInvoice(params: {
    username: string;
    nameProduct: string;
    chatId: string;
    location: string;
    status: 'active' | 'pending' | 'failed';
    note?: string;
  }) {
    return makeApiCall('/invoice', {
      actions: 'invoice_add',
      username: params.username,
      name_product: params.nameProduct,
      chat_id: params.chatId,
      location: params.location,
      status: params.status,
      note: params.note || ''
    });
  },

  // Get all services
  async getAllServices(limit: number = 50) {
    return makeApiCall('/service', {
      actions: 'services',
      limit
    });
  },

  // Get dashboard stats (combined users and invoices data)
  async getDashboardStats() {
    try {
      const [usersResponse, invoicesResponse] = await Promise.all([
        this.getAllUsers(1000),
        this.getAllInvoices(1000)
      ]);

      if (!usersResponse.success || !invoicesResponse.success) {
        throw new Error('Failed to fetch dashboard data');
      }

      const users = usersResponse.data || [];
      const invoices = invoicesResponse.data || [];

      // Calculate stats
      const totalUsers = Array.isArray(users) ? users.length : 0;
      const activeUsers = Array.isArray(users) ? users.filter((u: any) => u.is_active !== false).length : 0;
      const totalRevenue = Array.isArray(invoices) ? invoices.reduce((sum: number, inv: any) => {
        return sum + (inv.price_product || 0);
      }, 0) : 0;

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalRevenue,
          totalInvoices: Array.isArray(invoices) ? invoices.length : 0,
          recentUsers: Array.isArray(users) ? users.slice(0, 5) : []
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get dashboard stats',
        data: null
      };
    }
  }
};