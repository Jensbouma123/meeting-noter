import { NetworkError, isApiError } from "../errors.js";
export function toApiError(error) {
    if (isApiError(error))
        return error;
    return new NetworkError("Unexpected error", error);
}
