# API Shared Utilities

This directory contains shared utilities for building secure, consistent REST API endpoints.

## Pagination

### `parsePagination(searchParams)`

Parses pagination and sorting parameters from URL search params with validation and sensible defaults.

#### Usage

```javascript
import { parsePagination, buildPaginationMeta } from '@/lib/api/_shared/pagination';
import { apiSuccess } from '@/lib/api/_shared/response';

export const GET = withApiAuth(async (request, { businessId }) => {
  const { searchParams } = new URL(request.url);
  const { page, limit, offset, sortBy, sortOrder } = parsePagination(searchParams);

  const client = await pool.connect();
  try {
    // Get total count
    const countResult = await client.query(
      'SELECT COUNT(*) FROM invoices WHERE business_id = $1',
      [businessId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const result = await client.query(
      `SELECT * FROM invoices 
       WHERE business_id = $1 
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );

    const meta = buildPaginationMeta(page, limit, total);
    return apiSuccess({ invoices: result.rows }, 200, meta);
  } finally {
    client.release();
  }
});
```

#### Parameters

**searchParams**: `URLSearchParams` or object with `get()` method
- Typically from `new URL(request.url).searchParams`

#### Returns

Object with:
- `page` (number): Current page number (1-indexed, default: 1, min: 1)
- `limit` (number): Items per page (default: 50, min: 1, max: 100)
- `offset` (number): Database offset calculated as `(page - 1) * limit`
- `sortBy` (string): Field name to sort by (default: 'created_at', sanitized)
- `sortOrder` (string): Sort direction 'ASC' or 'DESC' (default: 'DESC')

#### Query Parameters

| Parameter | Aliases | Default | Validation |
|-----------|---------|---------|------------|
| `page` | - | 1 | Min: 1 |
| `limit` | `pageSize` | 50 | Min: 1, Max: 100 |
| `sortBy` | - | 'created_at' | Alphanumeric + underscore only |
| `sortOrder` | - | 'DESC' | Must be 'ASC' or 'DESC' |

#### Security Features

- **SQL Injection Prevention**: `sortBy` is sanitized to allow only alphanumeric characters and underscores
- **Input Validation**: All numeric values are validated and clamped to safe ranges
- **Type Safety**: Throws TypeError for invalid input types

### `buildPaginationMeta(page, limit, total)`

Builds standardized pagination metadata for API responses.

#### Usage

```javascript
const meta = buildPaginationMeta(page, limit, totalCount);
return apiSuccess({ items: result.rows }, 200, meta);
```

#### Parameters

- `page` (number): Current page number (1-indexed)
- `limit` (number): Items per page
- `total` (number): Total number of items across all pages

#### Returns

Object with:
- `page` (number): Current page number
- `pageSize` (number): Items per page
- `total` (number): Total number of items
- `totalPages` (number): Total number of pages (calculated)

#### Example Response

```json
{
  "success": true,
  "data": {
    "invoices": [...]
  },
  "meta": {
    "page": 2,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

## Response Helpers

### `apiSuccess(data, status, meta, rateLimitContext)`

Creates a standardized success response with optional rate limiting headers.

#### Usage

```javascript
import { apiSuccess } from '@/lib/api/_shared/response';

// Simple success
return apiSuccess({ invoice: result });

// With custom status
return apiSuccess({ invoice: result }, 201);

// With pagination metadata
return apiSuccess({ invoices: results }, 200, meta);

// With rate limiting (recommended for all API routes)
return apiSuccess(
  { invoices: results }, 
  200, 
  meta, 
  { businessId, planTier }
);
```

#### Parameters

- `data` (any): The response data (can be any JSON-serializable value)
- `status` (number, optional): HTTP status code (default: 200)
- `meta` (object, optional): Metadata (e.g., pagination info, timestamps)
- `rateLimitContext` (object, optional): Rate limit context
  - `businessId` (string): Business ID for rate limit tracking
  - `planTier` (string): Plan tier (free, basic, standard, premium, enterprise)

#### Rate Limiting

When `rateLimitContext` is provided, the following headers are added to the response:

- `X-RateLimit-Limit`: Maximum requests allowed per minute for the plan tier
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Unix timestamp (seconds) when the rate limit resets

**Rate Limits by Plan Tier:**

| Plan Tier | Requests/Minute |
|-----------|-----------------|
| free | 60 |
| basic | 120 |
| standard | 300 |
| premium | 600 |
| enterprise | 1200 |

### `apiError(code, message, status, details, rateLimitContext)`

Creates a standardized error response with optional rate limiting headers.

#### Usage

```javascript
import { apiError } from '@/lib/api/_shared/response';

// Simple error
return apiError('NOT_FOUND', 'Invoice not found', 404);

// With validation details
return apiError('VALIDATION_ERROR', 'Invalid input', 400, {
  fields: { email: 'Invalid format' }
});

// With rate limiting
return apiError(
  'NOT_FOUND', 
  'Invoice not found', 
  404, 
  null, 
  { businessId, planTier }
);
```

#### Parameters

- `code` (string): Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED')
- `message` (string): Human-readable error message
- `status` (number, optional): HTTP status code (default: 400)
- `details` (object, optional): Additional error details (e.g., validation errors)
- `rateLimitContext` (object, optional): Rate limit context (same as `apiSuccess`)

### Rate Limit Implementation

The rate limiting system uses an in-memory store with automatic cleanup:

- **Window**: 1 minute rolling window per business
- **Tracking**: Counts requests per business ID
- **Cleanup**: Expired entries are automatically removed every 5 minutes
- **Enforcement**: Rate limits are tracked but not enforced (informational only)

To enforce rate limits, check the `X-RateLimit-Remaining` header and return a 429 error when it reaches 0:

```javascript
export const GET = withApiAuth(async (request, { businessId, planTier }) => {
  // Check if rate limit exceeded (optional enforcement)
  const { remaining } = trackRateLimit(businessId, planTier);
  if (remaining <= 0) {
    return apiError(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please try again later.',
      429,
      null,
      { businessId, planTier }
    );
  }

  // Process request...
  return apiSuccess({ data }, 200, null, { businessId, planTier });
});
```

## Middleware

### `withApiAuth(handler)`

Authentication and authorization middleware for Next.js API routes. Wraps API route handlers to enforce:

1. **Authentication**: User must be logged in via better-auth
2. **Business Authorization**: User must have access to the specified business
3. **Context Extraction**: Provides session, businessId, role, and planTier to handlers

#### Usage

```javascript
import { NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api/_shared/middleware';

export const GET = withApiAuth(async (request, { session, businessId, role, planTier }) => {
  // Your handler code here
  // businessId is already validated
  const data = await fetchData(businessId);
  return NextResponse.json({ data });
});
```

#### Parameters

**handler**: `(request, context) => Promise<NextResponse>`
- `request`: NextRequest object
- `context`: Object containing:
  - `session`: Better-auth session object with user details
  - `businessId`: Validated business ID (string)
  - `role`: User's role in the business ('owner', 'manager', 'accountant', 'viewer')
  - `planTier`: Business plan tier ('free', 'starter', 'business', 'premium', 'enterprise')
  - `routeParams`: Route parameters (e.g., `{ params: { id: '123' } }`)

#### Business ID Extraction

The middleware automatically extracts `business_id` from:

- **GET/HEAD requests**: Query parameters (`?business_id=123` or `?businessId=123`)
- **POST/PUT/DELETE/PATCH requests**: Request body (`{ "business_id": "123" }` or `{ "businessId": "123" }`)

Both `business_id` (snake_case) and `businessId` (camelCase) are supported.

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHENTICATED` | No session or session lookup failed |
| 400 | `MISSING_BUSINESS_ID` | business_id parameter not provided |
| 403 | `BUSINESS_ACCESS_DENIED` | User does not have access to the business |
| 500 | `INTERNAL_ERROR` | Unexpected error during authentication |

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

#### Platform Admin Bypass

Users with platform-level access (role: 'admin' or platform owner email) automatically:
- Get `role: 'owner'` for all businesses
- Get `planTier: 'enterprise'` regardless of actual plan
- Bypass business membership checks

#### Plan Tier Handling

- Expired plans are automatically downgraded to 'free'
- Null or invalid plan tiers default to 'free'
- Plan tier is resolved using `resolvePlanTier()` from `@/lib/config/plans`

#### Role Extraction

Roles are extracted from the `business_users` table:
- If no entry exists but user is the business owner, an entry is auto-created
- Inactive users (`status !== 'active'`) are denied access
- Platform admins always get 'owner' role

## Examples

### Basic GET Endpoint

```javascript
// app/api/v1/products/route.js
import { NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import pool from '@/lib/db';

export const GET = withApiAuth(async (request, { businessId, role, planTier }) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM products 
       WHERE business_id = $1 AND is_deleted = false
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: { page, limit, total: result.rowCount },
    });
  } finally {
    client.release();
  }
});
```

### POST Endpoint with Validation

```javascript
// app/api/v1/products/route.js
import { NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import { productSchema } from '@/lib/validation/schemas';

export const POST = withApiAuth(async (request, { session, businessId, role }) => {
  // Check permissions
  if (role === 'viewer') {
    return NextResponse.json(
      { success: false, error: 'Viewers cannot create products', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  // Parse and validate body
  const body = await request.json();
  const validation = productSchema.safeParse(body);
  
  if (!validation.success) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: validation.error.errors 
      },
      { status: 400 }
    );
  }

  // Create product (example)
  const product = {
    ...validation.data,
    business_id: businessId,
    created_by: session.user.id,
  };

  // Save to database...

  return NextResponse.json(
    { success: true, data: product },
    { status: 201 }
  );
});
```

### Dynamic Route with ID Parameter

```javascript
// app/api/v1/products/[id]/route.js
import { NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api/_shared/middleware';
import pool from '@/lib/db';

export const GET = withApiAuth(async (request, { businessId, routeParams }) => {
  const productId = routeParams?.params?.id;

  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'Product ID is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM products 
       WHERE id = $1 AND business_id = $2 AND is_deleted = false`,
      [productId, businessId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } finally {
    client.release();
  }
});

export const DELETE = withApiAuth(async (request, { businessId, role, routeParams }) => {
  // Only owners and managers can delete
  if (role !== 'owner' && role !== 'manager') {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  const productId = routeParams?.params?.id;

  // Soft delete the product...

  return NextResponse.json({
    success: true,
    message: 'Product deleted successfully',
  });
});
```

### Plan Tier Gating

```javascript
export const POST = withApiAuth(async (request, { businessId, planTier }) => {
  // Check if feature is available on current plan
  if (planTier === 'free') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'This feature requires a paid plan',
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'starter'
      },
      { status: 403 }
    );
  }

  // Feature logic...
});
```

## Best Practices

### 1. Always Use withApiAuth

All API endpoints that access business data MUST use `withApiAuth`:

```javascript
// ✅ GOOD
export const GET = withApiAuth(async (request, { businessId }) => {
  // businessId is validated
});

// ❌ BAD - No authentication
export async function GET(request) {
  const businessId = request.nextUrl.searchParams.get('business_id');
  // businessId is not validated!
}
```

### 2. Check Permissions

Always verify role-based permissions for write operations:

```javascript
export const POST = withApiAuth(async (request, { role }) => {
  if (role === 'viewer') {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }
  // Proceed with creation
});
```

### 3. Validate Entity Ownership

When accessing specific entities, verify they belong to the business:

```javascript
const result = await client.query(
  `SELECT * FROM invoices WHERE id = $1 AND business_id = $2`,
  [invoiceId, businessId]
);

if (result.rows.length === 0) {
  return NextResponse.json(
    { success: false, error: 'Invoice not found', code: 'NOT_FOUND' },
    { status: 404 }
  );
}
```

### 4. Use Consistent Response Format

Always return responses in this format:

```javascript
// Success
return NextResponse.json({
  success: true,
  data: result,
  meta: { page, limit, total }, // Optional pagination metadata
});

// Error
return NextResponse.json(
  {
    success: false,
    error: 'Error message',
    code: 'ERROR_CODE',
    details: {}, // Optional additional details
  },
  { status: 400 }
);
```

### 5. Handle Validation Errors

Use Zod schemas for request validation:

```javascript
import { invoiceSchema } from '@/lib/validation/schemas';

const validation = invoiceSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validation.error.errors,
    },
    { status: 400 }
  );
}
```

### 6. Log Audit Trail

For sensitive operations, log to audit_logs:

```javascript
await client.query(
  `INSERT INTO audit_logs (business_id, user_id, action, entity_type, entity_id, details)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [businessId, session.user.id, 'delete', 'product', productId, { reason: 'User requested' }]
);
```

## Testing

The middleware includes comprehensive unit tests. Run them with:

```bash
npm test -- lib/api/_shared/middleware.test.js --run
```

Test coverage includes:
- Authentication validation
- Business ID extraction (query params and body)
- Business authorization
- Role extraction
- Plan tier handling
- Platform admin bypass
- Error handling
- Handler invocation

## Security Considerations

1. **Multi-tenancy**: The middleware enforces business_id validation at the API layer
2. **Session validation**: Uses better-auth for secure session management
3. **Role-based access**: Provides role information for fine-grained authorization
4. **Plan enforcement**: Enables feature gating based on subscription tier
5. **Error messages**: Avoids leaking sensitive information in error responses
6. **Database connection**: Always releases connections in finally blocks

## Related Files

- `lib/rbac/serverGuard.js` - Similar pattern for Server Actions
- `lib/config/plans.js` - Plan tier definitions and feature flags
- `lib/config/platform.js` - Platform admin detection
- `lib/auth.js` - Better-auth configuration
- `lib/db.js` - PostgreSQL connection pool

## Migration from Server Actions

If you have existing Server Actions and want to expose them via REST API:

1. Create the API route file
2. Wrap with `withApiAuth`
3. Extract business_id from request
4. Call the existing service layer function
5. Return standardized JSON response

Example:

```javascript
// Before (Server Action)
export async function createInvoice(businessId, data) {
  const { session, role } = await withGuard(businessId, { permission: 'sales.create_invoice' });
  return await InvoiceService.createInvoice(data, { businessId, userId: session.user.id });
}

// After (API Route)
export const POST = withApiAuth(async (request, { session, businessId, role }) => {
  if (!hasPermission(role, 'sales.create_invoice')) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions', code: 'PERMISSION_DENIED' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const result = await InvoiceService.createInvoice(body, { 
    businessId, 
    userId: session.user.id 
  });

  return NextResponse.json({ success: true, data: result }, { status: 201 });
});
```
