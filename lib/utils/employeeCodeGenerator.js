/**
 * Employee Code Generator
 * Generates sequential employee codes in EMP-XXXX format
 */

/**
 * Generate next employee code for a business
 * Format: EMP-0001, EMP-0002, etc.
 * 
 * @param {string} businessId - Business UUID
 * @returns {Promise<string>} - Next employee code
 */
export async function generateNextEmployeeCode(businessId) {
    try {
        const response = await fetch(`/api/payroll/next-employee-code?businessId=${businessId}`);
        if (!response.ok) throw new Error('Failed to fetch next code');
        
        const data = await response.json();
        return data.code || generateFallbackCode();
    } catch (error) {
        console.error('Generate employee code error:', error);
        // Fallback to timestamp-based unique code
        return generateFallbackCode();
    }
}

/**
 * Generate a fallback employee code based on timestamp
 * Used when API call fails
 * 
 * @returns {string} - Fallback employee code
 */
function generateFallbackCode() {
    const timestamp = Date.now().toString();
    const unique = timestamp.slice(-6);
    return `EMP-${unique}`;
}

/**
 * Validate employee code format
 * Must be non-empty and typically follow EMP-XXXX pattern
 * 
 * @param {string} code - Employee code to validate
 * @returns {boolean} - True if valid
 */
export function validateEmployeeCode(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Trim and check length
    const trimmed = code.trim();
    if (trimmed.length === 0 || trimmed.length > 50) return false;
    
    return true;
}

/**
 * Format employee code to standard format
 * Removes extra spaces, converts to uppercase
 * 
 * @param {string} code - Raw employee code
 * @returns {string} - Formatted employee code
 */
export function formatEmployeeCode(code) {
    if (!code) return '';
    return code.trim().toUpperCase();
}
