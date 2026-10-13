export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SECRET_KEY?: string;
  INTEGRATION_MASTER_KEY?: string;
  OCR_WORKER_URL?: string;
  OCR_API_KEY?: string;
  APP_URL: string;
}
