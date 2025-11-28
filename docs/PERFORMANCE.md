# HZ Navigator Performance Guide

This document covers performance testing, monitoring, and optimization strategies for the HZ Navigator application.

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| API p95 response time | < 200ms | > 500ms | > 2s |
| API p99 response time | < 500ms | > 1s | > 5s |
| Page load time | < 2s | > 3s | > 5s |
| Database query time | < 50ms | > 100ms | > 200ms |
| Error rate | < 1% | > 3% | > 5% |
| Uptime | 99.9% | < 99.5% | < 99% |
| Cache hit rate | > 80% | < 60% | < 40% |

## Load Testing

### k6 Test Suite

Located in `performance/k6/scenarios/`:

#### Load Test (`load-test.js`)
Tests normal load conditions:
- 100 concurrent users (ramped up gradually)
- 1000 address verifications per minute
- 500 API requests per second spike test

```bash
# Run load test
npm run perf:load

# Run against local server
npm run perf:local

# With custom base URL
k6 run scenarios/load-test.js --env BASE_URL=https://staging.example.com
```

#### Stress Test (`stress-test.js`)
Identifies breaking points:
- Ramps from 0 to 500 concurrent users
- Holds at each level for 3 minutes
- Identifies when performance degrades

```bash
npm run perf:stress
```

#### Soak Test (`soak-test.js`)
Tests long-term stability:
- 50 constant users
- Extended duration (1+ hours)
- Identifies memory leaks and resource exhaustion

```bash
npm run perf:soak
```

### Test Results Interpretation

```
✓ http_req_duration...............: avg=45.2ms min=12ms med=38ms max=890ms p(90)=78ms p(95)=120ms
✓ http_req_failed..................: 0.12%  ✓ 12     ✗ 9988
✓ http_reqs.......................: 10000  833.33/s
```

- **avg**: Average response time
- **p(95)**: 95th percentile - target < 200ms
- **http_req_failed**: Error rate - target < 1%

## Database Optimization

### Indexes

The migration `007_performance_optimization.sql` adds:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_businesses_user_status ON businesses(user_id, created_at DESC);
CREATE INDEX idx_certifications_status_expiry ON certifications(status, expires_at);

-- Full-text search
CREATE INDEX idx_businesses_name_search ON businesses USING gin(to_tsvector('english', name));
```

### Materialized Views

Pre-computed views for complex queries:

- `mv_compliance_summary` - Business compliance status
- `mv_hubzone_stats` - HUBZone statistics by state
- `mv_dashboard_stats` - Dashboard aggregations

Refresh materialized views (run hourly):
```sql
SELECT refresh_materialized_views();
```

### Query Analysis

Use EXPLAIN ANALYZE for slow queries:

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM certifications 
WHERE business_id = 'uuid' 
ORDER BY created_at DESC;
```

Check slow query logs:
```sql
SELECT query_template, AVG(execution_time_ms), COUNT(*)
FROM query_performance_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_template
ORDER BY AVG(execution_time_ms) DESC
LIMIT 20;
```

### Connection Pooling

Recommended PostgreSQL settings:
```ini
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 128MB
```

## Caching Strategy

### Cache Layers

| Layer | TTL | Use Case |
|-------|-----|----------|
| HUBZone map tiles | 24h | Static geographic data |
| Compliance calculations | 1h | Computed compliance status |
| Verified addresses | 90 days | Address verification results |
| Dashboard stats | 5 min | Aggregated statistics |
| User profiles | 15 min | User-specific data |
| Session data | 24h | Authentication sessions |

### Redis Configuration

```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Set environment variable
export REDIS_URL=redis://localhost:6379
```

### Cache Invalidation

```typescript
import { cacheService } from './services/cacheService';

// Invalidate on data change
await cacheService.invalidateCompliance(businessId);
await cacheService.invalidateUserProfile(userId);

// Pattern-based invalidation
await cacheService.deletePattern('comp:*');
```

### ETag Support

API responses include ETags for conditional requests:

```
GET /api/hubzones HTTP/1.1
If-None-Match: "abc123"

HTTP/1.1 304 Not Modified
```

## API Performance Monitoring

### Endpoints

- `GET /api/metrics` - Performance metrics (admin only)
- `GET /api/metrics/health` - Health status with performance data
- `GET /api/metrics/detailed` - Comprehensive monitoring data
- `GET /api/metrics/endpoints` - Per-endpoint performance

### Response Headers

All API responses include:
- `X-Response-Time: 45.23ms`
- `X-Cache: HIT` or `X-Cache: MISS`
- `X-Request-ID: uuid`

### Slow Request Logging

Requests slower than 1 second are logged:
```
[SLOW REQUEST] GET /api/hubzones/check
  responseTime: 1.23s
  statusCode: 200
  requestId: abc-123
```

## Frontend Performance

### Virtual Scrolling

For large lists (100+ items):

```tsx
import { VirtualList } from '@/components/Common';

<VirtualList
  items={employees}
  itemHeight={64}
  height={600}
  renderItem={(employee, index) => (
    <EmployeeRow key={employee.id} employee={employee} />
  )}
/>
```

### Lazy Loading Images

```tsx
import { LazyImage, ProgressiveImage } from '@/components/Common';

// Basic lazy loading
<LazyImage
  src="/images/large-map.jpg"
  alt="HUBZone Map"
  placeholder="/images/placeholder.jpg"
/>

// Progressive loading (blur-up effect)
<ProgressiveImage
  lowQualitySrc="/images/map-thumb.jpg"
  highQualitySrc="/images/map-full.jpg"
  alt="HUBZone Map"
/>
```

### Debouncing

```tsx
import { useDebounce, useDebouncedCallback } from '@/hooks';

// Debounce search input
const debouncedSearch = useDebounce(searchTerm, 300);

// Debounce callback
const handleSearch = useDebouncedCallback((term) => {
  api.search(term);
}, 300);
```

### Code Splitting

Routes are automatically code-split. For additional splitting:

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
const ExpensiveList = memo(({ items }) => {
  // ...
});

// Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => b.date - a.date);
}, [items]);
```

## Monitoring Setup

### Application Monitoring (Datadog/New Relic)

Environment variables:
```bash
DATADOG_API_KEY=xxx
NEW_RELIC_LICENSE_KEY=xxx
```

### Infrastructure (CloudWatch)

See `monitoring/cloudwatch/cloudwatch-agent-config.json` for configuration.

### Error Tracking (Sentry)

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Uptime Monitoring

Configure Pingdom or UptimeRobot to monitor:
- `https://api.hz-navigator.com/api/health`
- `https://hz-navigator.com/`

## Alerting

### Thresholds

| Alert | Warning | Critical |
|-------|---------|----------|
| Error rate | > 3% | > 5% |
| Response time p95 | > 500ms | > 2s |
| CPU usage | > 70% | > 80% |
| Memory usage | > 80% | > 90% |
| Disk usage | > 70% | > 80% |
| Failed jobs | > 5 | > 10 |

### Alert Channels

Configure in `monitoring/alerts/alerting-rules.yaml`:

1. **Slack** - All alerts
2. **PagerDuty** - Critical alerts only
3. **Email** - Daily digest

## Performance Checklist

### Before Release

- [ ] Run load tests against staging
- [ ] Check for N+1 queries
- [ ] Verify index usage with EXPLAIN ANALYZE
- [ ] Check cache hit rates
- [ ] Run Lighthouse audit (score > 90)
- [ ] Verify bundle size hasn't increased significantly
- [ ] Check for memory leaks with soak test

### Weekly Maintenance

- [ ] Review slow query logs
- [ ] Check error rates
- [ ] Review cache hit rates
- [ ] Check resource utilization trends
- [ ] Refresh materialized views
- [ ] Clean up old audit logs

### Monthly Review

- [ ] Analyze p95 response time trends
- [ ] Review capacity needs
- [ ] Optimize top 10 slowest queries
- [ ] Review and update indexes
- [ ] Update performance baselines

## Troubleshooting

### High Response Times

1. Check database query times in logs
2. Verify cache is working (`X-Cache: HIT`)
3. Check for connection pool exhaustion
4. Review CPU/memory usage

### High Error Rates

1. Check error logs for patterns
2. Verify external service availability
3. Check rate limiting isn't too aggressive
4. Review recent deployments

### Memory Issues

1. Run soak test to identify leaks
2. Check Node.js heap usage
3. Review Redis memory usage
4. Check for unclosed connections

### Database Performance

1. Check connection count
2. Review slow query log
3. Verify indexes are being used
4. Check for lock contention

