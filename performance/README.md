# HZ Navigator Performance Testing

This directory contains performance testing scripts and monitoring configurations.

## Load Testing with k6

### Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Running Tests

```bash
cd performance/k6

# Run load test (default scenario)
npm run test:load

# Run stress test
npm run test:stress

# Run soak test (1 hour)
npm run test:soak

# Run against local server
npm run test:local

# Run for CI/CD
npm run test:ci
```

### Test Scenarios

#### Load Test (`load-test.js`)
- **Purpose**: Test normal load conditions
- **Configuration**:
  - Ramps up to 100 concurrent users
  - Tests 1000 address verifications/minute
  - Tests API spike of 500 requests/second
- **Duration**: ~20 minutes
- **Thresholds**:
  - P95 response time < 200ms
  - Error rate < 1%

#### Stress Test (`stress-test.js`)
- **Purpose**: Find breaking points
- **Configuration**:
  - Ramps from 0 to 500 concurrent users
  - Holds at each level for 3 minutes
- **Duration**: ~25 minutes
- **Identifies**:
  - Maximum capacity
  - Performance degradation points
  - Resource bottlenecks

#### Soak Test (`soak-test.js`)
- **Purpose**: Test stability over time
- **Configuration**:
  - 50 constant users
  - Extended duration (1+ hours)
- **Identifies**:
  - Memory leaks
  - Resource exhaustion
  - Long-running stability issues

### Environment Variables

```bash
# Set custom base URL
k6 run scenarios/load-test.js --env BASE_URL=https://staging.hz-navigator.com

# Set test duration
k6 run scenarios/soak-test.js --env DURATION=4h
```

### Output Formats

```bash
# JSON output for CI/CD
k6 run scenarios/load-test.js --out json=results.json

# InfluxDB for Grafana dashboards
k6 run scenarios/load-test.js --out influxdb=http://localhost:8086/k6

# CSV output
k6 run scenarios/load-test.js --out csv=results.csv
```

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API p95 | < 200ms | > 500ms |
| API p99 | < 500ms | > 1s |
| Page load | < 2s | > 5s |
| Database queries | < 50ms | > 200ms |
| Error rate | < 1% | > 5% |
| Uptime | 99.9% | < 99% |

## Monitoring

### Endpoints

- `/api/metrics` - Performance metrics (admin only)
- `/api/metrics/health` - Health status with performance data
- `/api/metrics/detailed` - Comprehensive monitoring data
- `/api/metrics/system` - System resource metrics
- `/api/metrics/alerts` - Active and historical alerts

### Alerting

See `monitoring/alerts/alerting-rules.yaml` for alert configurations.

Alerts are triggered for:
- Error rate > 5%
- Response time p95 > 2 seconds
- CPU > 80%
- Memory > 90%
- Disk > 80%
- Failed jobs > 10

### External Services

Configure these services for production monitoring:

1. **Application Monitoring**: New Relic or Datadog
2. **Infrastructure**: AWS CloudWatch
3. **Logs**: CloudWatch Logs or Elasticsearch
4. **Uptime**: Pingdom or UptimeRobot
5. **Errors**: Sentry

## Caching

### Cache TTLs

| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| HUBZone map tiles | 24 hours | Manual |
| Compliance calculations | 1 hour | On change |
| Verified addresses | 90 days | Never |
| Dashboard stats | 5 minutes | Auto |
| User profiles | 15 minutes | On change |

### Redis Setup

```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:alpine

# Set environment variable
export REDIS_URL=redis://localhost:6379
```

## Database Optimization

### Running Migrations

```bash
cd backend
npm run migrate
```

The migration `007_performance_optimization.sql` adds:
- Additional indexes for common queries
- Materialized views for complex aggregations
- Query performance logging
- Optimized functions for HUBZone checks

### Refreshing Materialized Views

```sql
-- Manually refresh (run during low-traffic periods)
SELECT refresh_materialized_views();

-- Or set up a cron job
0 * * * * psql -c "SELECT refresh_materialized_views();"
```

### Analyzing Slow Queries

```sql
-- Find slowest queries
SELECT query_template, AVG(execution_time_ms) as avg_time, COUNT(*) as count
FROM query_performance_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_template
ORDER BY avg_time DESC
LIMIT 20;
```

## Frontend Optimizations

### Virtual Scrolling

Use `VirtualList` component for lists with 100+ items:

```tsx
import { VirtualList } from '@/components/Common';

<VirtualList
  items={largeDataset}
  itemHeight={48}
  height={600}
  renderItem={(item, index) => <Row key={item.id} data={item} />}
/>
```

### Lazy Images

Use `LazyImage` component for images:

```tsx
import { LazyImage } from '@/components/Common';

<LazyImage
  src="/large-image.jpg"
  alt="Description"
  placeholder="/placeholder.jpg"
/>
```

### Code Splitting

Routes are lazy loaded automatically. For additional splitting:

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSpinner />}>
  <HeavyComponent />
</Suspense>
```

