function formatFieldErrors(errors) {
    if (!errors || typeof errors !== 'object') return null;
    const parts = Object.entries(errors)
        .filter(([, message]) => message)
        .map(([field, message]) => (field === '_general' ? String(message) : `${field}: ${message}`));
    return parts.length > 0 ? parts.join('; ') : null;
}

export function createApiError(result, fallbackMessage = 'Request failed') {
    const fieldDetail = formatFieldErrors(result?.errors);
    const error = new Error(fieldDetail || result?.error || fallbackMessage);

    error.code = result?.errorCode || result?.code || null;
    error.validationErrors = result?.errors || null;
    error.requiredPlan = result?.requiredPlan || result?.details?.requiredPlan || null;
    error.limitKey = result?.limitKey || result?.details?.limitKey || null;

    const limitCandidate = result?.limit ?? result?.details?.limit;
    error.limit = Number.isFinite(Number(limitCandidate)) ? Number(limitCandidate) : null;

    error.details = result?.details || null;

    return error;
}
