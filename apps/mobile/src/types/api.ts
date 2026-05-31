export interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       code: string;
       message: string;
       details?: unknown;
     };
     meta?: {
       page: number;
       limit: number;
       total: number;
       hasMore: boolean;
     };
   }

   

   export interface User {
     id: string
     phone: string
     firstName: string | null
     lastName: string | null
     email: string | null
     profileImage: string | null
     role: "customer" | "partner" | "admin"
     referralCode: string | null
     isOnboarded: boolean
   }

   export interface UserPreferences {
     id: string
     userId: string
     notificationsEnabled: boolean
     smsEnabled: boolean
     emailEnabled: boolean
     language: string
   }
   