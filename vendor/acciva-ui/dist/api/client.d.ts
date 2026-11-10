import type { ApiClientConfig, RequestBody, RequestOptions } from "./types.js";
export interface ApiClient {
    get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
    post<T = unknown, B extends RequestBody = RequestBody>(path: string, body?: B, options?: RequestOptions): Promise<T>;
    put<T = unknown, B extends RequestBody = RequestBody>(path: string, body?: B, options?: RequestOptions): Promise<T>;
    patch<T = unknown, B extends RequestBody = RequestBody>(path: string, body?: B, options?: RequestOptions): Promise<T>;
    delete<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
}
export declare function createApiClient(config: ApiClientConfig): ApiClient;
