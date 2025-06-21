
import { PanelUserCreationService } from '@/services/panelUserCreationService';

export interface CreateUserRequest {
  username: string;
  dataLimitGB: number;
  durationDays: number;
  notes?: string;
  panelType: 'marzban';
  subscriptionId?: string;
  isFreeTriaL?: boolean;
  selectedPlanId?: string;
}

export interface CreateUserResponse {
  success: boolean;
  data?: {
    username: string;
    subscription_url: string;
    expire: number;
    data_limit: number;
    panel_type: string;
    panel_name: string;
    panel_id?: string;
  };
  error?: string;
}

// Legacy service - now delegates to the new centralized service
export class UserCreationService {
  static async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE (LEGACY): Delegating to centralized service:', request);
    
    if (!request.selectedPlanId) {
      return {
        success: false,
        error: 'Plan ID is required for user creation'
      };
    }

    try {
      const result = await PanelUserCreationService.createUserFromPanel({
        planId: request.selectedPlanId,
        username: request.username,
        dataLimitGB: request.dataLimitGB,
        durationDays: request.durationDays,
        notes: request.notes,
        subscriptionId: request.subscriptionId,
        isFreeTriaL: request.isFreeTriaL
      });

      return result;
    } catch (error) {
      console.error('USER_CREATION_SERVICE (LEGACY): Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async createFreeTrial(
    username: string, 
    planType: 'lite' | 'plus',
    dataLimitGB: number = 1,
    durationDays: number = 1
  ): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE (LEGACY): Creating free trial, delegating to centralized service');
    
    return PanelUserCreationService.createFreeTrial(
      username,
      planType, // Use planType as planId
      dataLimitGB,
      durationDays
    );
  }

  static async createSubscription(
    username: string,
    dataLimitGB: number,
    durationDays: number,
    panelType: 'marzban',
    subscriptionId: string,
    notes?: string,
    selectedPlanId?: string
  ): Promise<CreateUserResponse> {
    console.log('USER_CREATION_SERVICE (LEGACY): Creating subscription, delegating to centralized service');
    
    if (!selectedPlanId) {
      return {
        success: false,
        error: 'Plan ID is required for subscription creation'
      };
    }

    return PanelUserCreationService.createPaidSubscription(
      username,
      selectedPlanId,
      dataLimitGB,
      durationDays,
      subscriptionId,
      notes
    );
  }
}
