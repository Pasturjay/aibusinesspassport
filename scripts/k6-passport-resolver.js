import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 virtual users
    { duration: '1m', target: 200 },  // Sustained load at 200 VUs
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'],   // Error rate must be under 1%
  },
};

export default function () {
  const targetUrl = __ENV.TARGET_URL || 'https://app.aibusinesspassport.ng/p/demo-passport-id';
  
  const res = http.get(targetUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'k6-load-test-runner/1.0',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response contains passport branding': (r) => r.body.includes('AI Business Passport'),
    'response time under 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
