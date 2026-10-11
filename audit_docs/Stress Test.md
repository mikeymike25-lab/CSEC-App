# CSEC Sentinel - Stress Testing Plan
**Group No. 5 | IT 009 - Systems Integration and Architecture 1**
**Technological Institute of the Philippines - Quezon City**
**Instructor:** Mr. Allan Burgos | **Section:** IT31S3

---

## Table of Contents
1. [System Overview and Architecture](#1-system-overview-and-architecture)
2. [Backend Deep Dive: Identified Bottlenecks](#2-backend-deep-dive-identified-bottlenecks)
3. [Normal Operating Conditions (Baseline)](#3-normal-operating-conditions-baseline)
4. [Stress Scenarios](#4-stress-scenarios)
5. [Key Performance Metrics to Track](#5-key-performance-metrics-to-track)
6. [Tool Selection: Grafana k6](#6-tool-selection-grafana-k6)
7. [Test Scripts](#7-test-scripts)
8. [Expected Outcomes and Failure Thresholds](#8-expected-outcomes-and-failure-thresholds)
9. [Full Testing Execution Roadmap](#9-full-testing-execution-roadmap)
10. [Infrastructure Constraints](#10-infrastructure-constraints)
11. [Remediation Recommendations](#11-remediation-recommendations)
12. [Group Member Reflections](#12-group-member-reflections)

---

## 1. System Overview and Architecture

**CSEC Sentinel** is a mobile cybersecurity application designed to protect Filipino GCash users from phishing URLs delivered via SMS and email. The system is a **multi-tier, cloud-hybrid architecture** combining a local device cache layer, a cloud-hosted Python Flask backend, and external AI/database services.

### 1.1 Full System Architecture

```
+------------------------------------------------------------------------+
|                      CSEC SENTINEL - SYSTEM LAYERS                     |
+------------------------------------------------------------------------+
|  [Mobile App - React Native / Expo]                                    |
|   +-- app/tabs/scan.tsx      -> URL Scan + Local Cache (AsyncStorage)  |
|   +-- app/tabs/gemini.tsx    -> Sentinel AI Chat Interface             |
|   +-- app/tabs/profile.tsx   -> User Profile + Cloudinary Upload       |
|   +-- components/            -> Shared UI, LinkInterceptor             |
|                                                                        |
|  [Local Cache - AsyncStorage]                                          |
|   +-- Key: "csec_history"    -> Device SQLite (Android)                |
|                                  App Support (iOS)                     |
|                                                                        |
|  [Auth and Database - Firebase]                                        |
|   +-- Firebase Auth          -> User login / email verification        |
|   +-- Firestore              -> Real-time account status / broadcasts  |
|   +-- Project: c-sec-database.firebaseapp.com                         |
|                                                                        |
|  [Backend - Python Flask on Render]                                    |
|   +-- Host: csec-sentinel-api.onrender.com                             |
|   +-- Tier: FREE (shared CPU, ~512MB RAM, cold starts)                |
|   +-- POST /analyze-link     -> 4-gate phishing detection pipeline     |
|   +-- POST /gemini-chat      -> AI cybersecurity chat assistant        |
|                                                                        |
|  [AI and ML Services]                                                  |
|   +-- Random Forest Model (csec_rf_model.pkl) - loaded in-process      |
|   +-- Levenshtein typosquatting engine (17 protected domains)         |
|   +-- Google Gemini API (gemini-3.1-flash-lite) - external API call   |
|                                                                        |
|  [CDN / Media - Cloudinary]                                            |
|   +-- Profile photo upload / storage                                   |
+------------------------------------------------------------------------+
```

### 1.2 The 4-Gate Detection Pipeline (/analyze-link)

| Gate | Protocol | Avg Speed | Description |
|------|----------|-----------|-------------|
| **Gate 1** | Blacklist Check | ~1 ms | In-memory set lookup against millions of known phishing URLs |
| **Gate 2** | Whitelist Check | ~1 ms | In-memory set lookup against ~1M Tranco whitelisted domains |
| **Gate 2.5** | Levenshtein Typosquatting | ~5-15 ms | Compares domain against 17 high-value protected domains |
| **Gate 3** | Random Forest AI | ~50-300 ms | Extracts 111 URL features then predicts phishing probability |
| **Gate 4** | Gemini Explanation | **1,000-3,000 ms** | External Google Gemini API call - **primary bottleneck** |

> **Critical Finding:** Gate 4 (Gemini API) is invoked on every request that reaches it, including whitelist hits. Every backend call incurs at minimum one external Gemini network round-trip, making it the dominant latency contributor and primary failure point under load.

---

## 2. Backend Deep Dive: Identified Bottlenecks

After full source analysis of `backend/server.py`, the following architectural vulnerabilities were identified:

### 2.1 No Request Queuing or Rate Limiting
- Flask runs in single-threaded mode via `app.run(debug=True)`
- Render free tier: only 1-2 Gunicorn workers max
- No backpressure mechanism, no async task offloading

### 2.2 Synchronous Gemini API Calls Block All Worker Threads

```python
# backend/server.py - synchronous, blocking call
response = model.generate_content(prompt)   # blocks for 1-3 seconds per call
```

While one request waits for Gemini, the worker thread is frozen. With 2 workers, just 3 concurrent Gemini requests causes HTTP 504 timeouts for all subsequent requests.

### 2.3 In-Memory Data Structures with No Distributed Cache

```python
# Loaded once at startup into RAM - consumes ~200-400 MB
blacklist_urls = set(blacklist_df['url'].astype(str).str.lower())
whitelist_domains = set(whitelist_df['domain'].astype(str).str.lower())
```

On Render free 512 MB instance, this leaves minimal headroom for the RF model and per-request processing.

### 2.4 Client-Side Cache Has No TTL Enforcement

- `scan.tsx` saves results under AsyncStorage key `csec_history`
- No time-to-live set - cached results persist indefinitely
- Security risk: a previously "Safe" URL added to the blacklist will continue returning stale "Safe" verdict

### 2.5 Cold Start Problem on Render Free Tier

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down takes **30-60 seconds** to respond while container boots and loads model + CSVs

---

## 3. Normal Operating Conditions (Baseline)

Based on group estimates from **Group Activity 4.1, Part II**:

| Parameter | Normal Estimate | Justification |
|-----------|----------------|---------------|
| Active users per day | 50-100 | Practical scale for initial deployment |
| Link scans per user per day | 3-5 | Typical SMS/email threat volume |
| Total link checks per day | 150-500 | Calculated from above two estimates |
| Local cache hit rate | 50-60% | Large number of unique URLs on the internet |
| Backend AI scans per day | 50-150 | After cache filtering removes hits |
| Average concurrent users | 2-5 | Realistic mobile app concurrency |
| P95 latency - cached result | < 50 ms | AsyncStorage local read |
| P95 latency - Gates 1-3 | 500-1,000 ms | Network + RF model inference |
| P95 latency - with Gate 4 Gemini | 2,000-4,000 ms | Includes external Gemini API call |

---

## 4. Stress Scenarios

### Scenario 1 - Baseline Load Test (Warm-Up)

**Goal:** Establish a reference performance profile under light, predictable load before ramping up stress tests.

| Parameter | Value |
|-----------|-------|
| Virtual Users (VUs) | 5 |
| Duration | 2 minutes |
| Target Endpoint | POST /analyze-link |
| URL Mix | 50% whitelist domains (fast path), 50% novel uncached URLs (full pipeline) |

**Pass Criteria:** P95 < 4,000 ms, Error rate < 1%, All responses return HTTP 200 with valid verdict field

---

### Scenario 2 - Step-Up Stress Test (Thread Starvation Hunt)

**Goal:** Find the exact concurrent user threshold where Render worker threads saturate and HTTP 504 errors begin.

| Stage | Virtual Users | Duration |
|-------|--------------|----------|
| Ramp up | 0 to 10 | 1 minute |
| Hold | 10 | 2 minutes |
| Ramp up | 10 to 25 | 1 minute |
| Hold | 25 | 2 minutes |
| Ramp up | 25 to 50 | 1 minute |
| Hold | 50 | 2 minutes |
| Ramp up | 50 to 100 | 1 minute |
| Hold | 100 | 2 minutes |
| Ramp down | 100 to 0 | 1 minute |

**URL Strategy:** Every VU submits a novel, unique URL per request to force full Gate 3 + Gate 4 execution.

**Pass Criteria:**
- Identify exact VU count where P99 first exceeds 10,000 ms
- Identify exact VU count where error rate first exceeds 5%
- Document timestamp and VU count of first HTTP 504

---

### Scenario 3 - Spike / TTL Burst Test (Worst-Case Scenario)

**Goal:** Simulate a mass cache invalidation event where all simultaneous users require fresh backend scans.

| Parameter | Value |
|-----------|-------|
| Pre-spike VUs | 5 (holds for 1 minute) |
| Spike VUs | 100 (instantaneous) |
| Spike Duration | 30 seconds |
| Post-spike VUs | 5 (continues for 3 minutes - recovery window) |

**Pass Criteria:**
- Server must not require manual restart to recover
- Response times return to baseline within 120 seconds of spike end
- HTTP 504 errors during spike < 30% of all spike requests

---

### Scenario 4 - Endurance / Soak Test (Memory Leak Detection)

**Goal:** Run sustained moderate load for 30 minutes to detect memory leaks from in-memory data structures.

| Parameter | Value |
|-----------|-------|
| Virtual Users | 10 |
| Duration | 30 minutes |
| Request Mix | 70% /analyze-link, 30% /gemini-chat |

**Monitoring:** Track Render dashboard memory every 5 minutes. Continuously growing memory without plateau confirms a leak.

---

### Scenario 5 - Gemini Chat Concurrent Load Test

**Goal:** Stress-test `POST /gemini-chat` - each message requires a full Gemini API round-trip with conversation history.

| Parameter | Value |
|-----------|-------|
| Virtual Users | 20 |
| Duration | 3 minutes |
| Message Size | ~500 chars (realistic user question) |
| History Size | 5-10 turns of conversation context |

**Expected failure mode:** Google API rate limiting (HTTP 429) or Flask worker starvation causing cascading 500/504.

---

## 5. Key Performance Metrics to Track

| Metric | k6 Variable | Target Threshold | Alert Threshold |
|--------|------------|-----------------|----------------|
| **P50 Response Time** | `http_req_duration` p(50) | < 2,000 ms | > 5,000 ms |
| **P95 Response Time** | `http_req_duration` p(95) | < 4,000 ms | > 8,000 ms |
| **P99 Response Time** | `http_req_duration` p(99) | < 6,000 ms | > 10,000 ms |
| **Throughput (RPS)** | `http_reqs` rate | >= 2 req/s | < 0.5 req/s |
| **HTTP Error Rate** | `http_req_failed` | < 5% | > 15% |
| **Request Wait (Queue)** | `http_req_waiting` | < 2,000 ms | > 5,000 ms |
| **Cache/DB Recovery Time** | Manual observation | < 120 seconds | > 300 seconds |
| **Backend Memory Usage** | Render Dashboard | < 450 MB | > 500 MB (OOM risk) |
| **Gemini API Failures** | k6 body check | < 1% | > 5% |

---

## 6. Tool Selection: Grafana k6

Based on group analysis in **Part V** of Group Activity 4.1, **Grafana k6** was selected over Locust.

### k6 vs. Locust: Decision Matrix

| Criteria | k6 - Selected | Locust - Not Selected |
|----------|--------------|----------------------|
| Runtime overhead | Very low (Go goroutines) | High (Python threads per VU) |
| VU scaling on laptop | 1,000+ VUs possible | 200-300 VUs before client CPU spikes |
| Script language | JavaScript/ES6 - team already familiar | Python |
| REST API testing | Native, zero configuration | Native, zero configuration |
| CI/CD integration | Native exit code on threshold fail | Requires additional scripting |
| **Verdict** | **Best fit for our stack** | **Higher overhead** |

### Installation

```bash
# Windows via Chocolatey
choco install k6

# Or download directly: https://github.com/grafana/k6/releases
```

---

## 7. Test Scripts

### 7.1 Baseline Load Test Script (`k6-baseline.js`)

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<4000"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = "https://csec-sentinel-api.onrender.com";

const TEST_URLS = [
  "https://google.com",
  "https://gcash.com",
  "http://gc4sh-login-verify.com/claim?id=12345",
  "http://paypa1-secure.net/wallet/update",
  "https://github.com",
  "http://bdo-banking-alert.xyz/reset",
  "https://facebook.com",
  "http://gcash-reward.link/free-cash?ref=sms",
];

export default function () {
  const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];
  const payload = JSON.stringify({ url: url });
  const params = {
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    timeout: "15s",
  };

  const res = http.post(BASE_URL + "/analyze-link", payload, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has verdict field": (r) => {
      try { return JSON.parse(r.body).verdict !== undefined; }
      catch (e) { return false; }
    },
    "no server error": (r) => r.status !== 500 && r.status !== 504,
  });

  sleep(1);
}
```

---

### 7.2 Step-Up Stress Test Script (`k6-stepup.js`)

```javascript
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Counter } from "k6/metrics";

const errorRate = new Rate("error_rate");
const timeoutCounter = new Counter("timeout_504_count");

export const options = {
  stages: [
    { duration: "1m", target: 10  },
    { duration: "2m", target: 10  },
    { duration: "1m", target: 25  },
    { duration: "2m", target: 25  },
    { duration: "1m", target: 50  },
    { duration: "2m", target: 50  },
    { duration: "1m", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "1m", target: 0   },
  ],
  thresholds: {
    http_req_duration: ["p(95)<8000", "p(99)<12000"],
    http_req_failed: ["rate<0.15"],
    error_rate: ["rate<0.10"],
  },
};

const BASE_URL = "https://csec-sentinel-api.onrender.com";

const NOVEL_URL_TEMPLATES = [
  "http://gcash-free-money-claim-now-urgent.com/wallet/verify?token=abc123",
  "http://bdo.com.ph.banking-alert-phishing.net/reset-pin",
  "http://maya-ph-wallet-suspend-alert.info/restore?uid=67890",
  "http://secure-gcash-verification.online/step1?code=PHISH99",
  "http://gcash-award-winner.net/claim?session=XYZ",
];

export default function () {
  const baseUrl = NOVEL_URL_TEMPLATES[__VU % NOVEL_URL_TEMPLATES.length];
  const url = baseUrl + "&ts=" + Date.now() + "&vu=" + __VU;

  const payload = JSON.stringify({ url: url });
  const params = {
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    timeout: "30s",
  };

  const res = http.post(BASE_URL + "/analyze-link", payload, params);

  const success = check(res, {
    "HTTP 200": (r) => r.status === 200,
    "not a 504 Gateway Timeout": (r) => r.status !== 504,
    "not a 500 Internal Error": (r) => r.status !== 500,
    "has verdict field": (r) => {
      try { return JSON.parse(r.body).verdict !== undefined; }
      catch(e) { return false; }
    }
  });

  if (res.status === 504) { timeoutCounter.add(1); }
  errorRate.add(!success);
  sleep(0.5);
}
```

---

### 7.3 Spike / TTL Burst Test Script (`k6-spike.js`)

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m",  target: 5   },  // Normal baseline
    { duration: "30s", target: 100 },  // Sudden spike - TTL burst simulation
    { duration: "3m",  target: 5   },  // Recovery observation window
  ],
  thresholds: {
    http_req_duration: ["p(95)<10000"],
    http_req_failed: ["rate<0.30"],
  },
};

const BASE_URL = "https://csec-sentinel-api.onrender.com";

export default function () {
  const testUrl =
    "http://gcash-ttl-burst-test-" + __ITER +
    ".phish.example.com/verify?ts=" + Date.now();

  const res = http.post(
    BASE_URL + "/analyze-link",
    JSON.stringify({ url: testUrl }),
    {
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      timeout: "30s",
    }
  );

  check(res, {
    "status 200 or acceptable rate-limit": (r) => [200, 429, 503].includes(r.status),
    "not catastrophic 500": (r) => r.status !== 500,
  });

  sleep(0.2);
}
```

---

### 7.4 Gemini Chat Concurrent Load Test Script (`k6-gemini-chat.js`)

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<6000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = "https://csec-sentinel-api.onrender.com";

const SAMPLE_QUESTIONS = [
  "What is a phishing attack and how do I recognize it?",
  "Is it safe to click on links sent via SMS from unknown numbers?",
  "How do I protect my GCash account from hackers?",
  "What should I do if I accidentally clicked a suspicious link?",
  "Can you explain what a fake login page looks like?",
];

export default function () {
  const message = SAMPLE_QUESTIONS[__VU % SAMPLE_QUESTIONS.length];

  const payload = JSON.stringify({
    message: message,
    history: [
      { role: "user", parts: "Hello" },
      { role: "model", parts: "Hello! I am the CSEC Sentinel, your cybersecurity assistant." },
    ],
  });

  const res = http.post(
    BASE_URL + "/gemini-chat",
    payload,
    {
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      timeout: "20s",
    }
  );

  check(res, {
    "status 200": (r) => r.status === 200,
    "has response field": (r) => {
      try { return JSON.parse(r.body).response !== undefined; }
      catch(e) { return false; }
    },
  });

  sleep(1);
}
```

---

### 7.5 How to Run All Tests

```bash
# IMPORTANT: Warm up server first with 5 manual requests before timed tests.
# This prevents Render cold-start from skewing your baseline metrics.

# Scenario 1 - Baseline
k6 run k6-baseline.js

# Scenario 2 - Step-Up Stress (saves JSON results)
k6 run --out json=stepup-results.json k6-stepup.js

# Scenario 3 - Spike / TTL Burst
k6 run k6-spike.js

# Scenario 4 - Soak Test (30 minutes)
k6 run --vus 10 --duration 30m k6-baseline.js

# Scenario 5 - Gemini Chat Load
k6 run k6-gemini-chat.js
```

---

## 8. Expected Outcomes and Failure Thresholds

### 8.1 Predicted Performance Profile by Concurrent User Range

| VU Range | Expected Behavior |
|----------|--------------------|
| 1-10 VUs | Normal operation. P95 < 4,000 ms. Error rate < 1%. |
| 10-25 VUs | Latency climbs. Gemini becomes the visible bottleneck. P99 may reach 6,000-8,000 ms. |
| 25-50 VUs | P99 exceeds 8,000 ms. First HTTP 504s appear from worker thread saturation. |
| 50-100 VUs | Full thread starvation. Error rate > 15%. Mass 504/500 cascade. |
| Post-spike recovery | Expected 60-180 seconds to return to pre-spike baseline without manual restart. |

### 8.2 Specific Failure Conditions

| Condition | Root Cause | Observable Symptom |
|-----------|-----------|-------------------|
| HTTP 504 Gateway Timeout | Worker threads exhausted waiting for Gemini | All new requests immediately time out |
| HTTP 500 Internal Server Error | Unhandled Flask exception under concurrent load | `{"error": "...", "status": "failed"}` |
| HTTP 429 Too Many Requests | Google Gemini free-tier rate limit hit | `{"error": "Gemini API Error: 429"}` |
| Cold Start 30-60s Delay | Render spin-down after 15 minutes idle | First request after idle takes extremely long |
| OOM Container Kill | Memory pressure from in-memory sets + RF model | Container restarts, all in-flight requests fail |

### 8.3 The Critical Failure Scenario (Group Activity 4.1, Part VIII)

The **TTL Burst + High User Load** combination is the most dangerous scenario because:
1. The Flask backend is on Render free tier with minimal CPU capacity
2. TTL burst forces many links through Random Forest algorithm simultaneously
3. Worker thread exhaustion causes request timeouts and slow scan results
4. Users cannot protect their GCash accounts during the outage window

**Graceful Degradation Expectation:** The system should queue requests rather than crash. HTTP 503 Service Unavailable is preferable to a silent crash. Recovery should be automatic via cache stabilization.

---

## 9. Full Testing Execution Roadmap

```
WEEK 1 - SETUP AND BASELINE
+------------------------------------------------------------------+
| Day 1: Install k6, verify connectivity to csec-sentinel-api      |
|        Ensure server is warm before first timed test             |
| Day 2: Run k6-baseline.js                                         |
|        Record: P50, P95, P99, RPS, error rate, Render memory     |
| Day 3: Analyze baseline results, document anomalies              |
+------------------------------------------------------------------+

WEEK 2 - STRESS AND SPIKE TESTING
+------------------------------------------------------------------+
| Day 1: Run k6-stepup.js                                           |
|        Goal: Find VU threshold for first 504 error               |
|        Save JSON output for analysis                              |
| Day 2: Run k6-spike.js                                            |
|        Goal: Measure recovery time after spike subsides          |
|        Monitor Render memory during and after spike              |
| Day 3: Run k6-gemini-chat.js                                      |
|        Goal: Find concurrent chat limit before cascade           |
| Day 4: Run 30-minute soak test                                    |
|        Goal: Detect memory growth pattern over time              |
| Day 5: Compile raw results from all test runs                    |
+------------------------------------------------------------------+

WEEK 3 - ANALYSIS AND REMEDIATION
+------------------------------------------------------------------+
| Day 1-2: Map results against Section 5 metric thresholds         |
|          Write findings narrative for each scenario              |
| Day 3-4: Implement Priority 1 fixes from Section 11             |
| Day 5: Re-run Scenarios 1 and 2 to validate improvements        |
+------------------------------------------------------------------+
```

---

## 10. Infrastructure Constraints

| Constraint | Impact on Testing |
|-----------|-----------------|
| **Render Free Tier** | ~512 MB RAM, shared CPU, 1-2 Gunicorn workers max |
| **Cold Start (15-min idle)** | Always warm up with 5 manual requests before timed tests |
| **Gemini API Rate Limits** | HTTP 429 from Google is expected behavior at high VU counts - document, do not treat as test failure |
| **No Backend Caching Layer** | Every cache miss triggers full RF + Gemini pipeline |
| **AsyncStorage TTL Gap** | TTL burst scenario is theoretical; simulates future state if TTL were implemented |
| **React Native Client** | Mobile app cannot be stress-tested with k6 - only REST APIs. Mobile behavior under load requires manual testing. |

---

## 11. Remediation Recommendations

### Priority 1 - Short Term (Implement Before Deployment)

**Fix 1.1: Add Client-Side Request Timeout**

```typescript
// scan.tsx - wrap fetch call with AbortController timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(apiUrl, {
    method: "POST",
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: cleanUrl }),
  });
  clearTimeout(timeoutId);
} catch (err) {
  if (err.name === "AbortError") {
    Alert.alert("Timeout", "Scan is taking too long. Please try again.");
  }
}
```

**Fix 1.2: Add TTL to AsyncStorage Cache**

```typescript
// When saving scan results:
const newEntry = {
  ...resultData,
  cachedAt: Date.now(),
  ttlMs: 24 * 60 * 60 * 1000,  // 24 hour TTL
};

// When reading cache:
const isExpired = Date.now() - cachedMatch.cachedAt > cachedMatch.ttlMs;
if (cachedMatch && !isExpired) {
  // Serve cached result
} else {
  // Proceed to backend
}
```

**Fix 1.3: Add Basic Rate Limiting to Flask Backend**

```python
# pip install Flask-Limiter
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(get_remote_address, app=app,
                  default_limits=["200 per day", "50 per hour"])

@app.route("/analyze-link", methods=["POST"])
@limiter.limit("30 per minute")
def analyze_link():
    # existing code...
```

### Priority 2 - Medium Term

**Fix 2.1: Implement Async Task Queue (Celery + Redis)**

- `/analyze-link` returns `{ "status": "processing", "task_id": "abc123" }` immediately
- Celery worker handles Gemini call in background
- Mobile polls `/result/abc123` every 1 second
- Worker threads are freed during Gemini processing

**Fix 2.2: Add Server-Side Redis Cache**

- Cache scan results by URL hash with 72-hour TTL
- Same URL from different users returns cached result instantly - no RF or Gemini call needed

### Priority 3 - Long Term

**Fix 3.1: Upgrade to Render Starter Tier ($7/month)**
- Dedicated CPU, no cold starts, more RAM

**Fix 3.2: Replace Flask with FastAPI**
- FastAPI with asyncio allows Gemini calls to run asynchronously without blocking worker threads
- Can multiply throughput by 5-10x at zero additional infrastructure cost

---

## 12. Group Member Reflections

> **Dela Cruz, Christian Joshua G.**
> Conducting stress testing was a major eye-opener in our development process. I realized that a strong machine learning model alone is not enough to guarantee a successful project; ML must be paired with a resilient, well-tested infrastructure in a controlled environment. Beyond simple response time, stress testing exposed critical architectural variables - such as worker thread starvation, error isolation, and database recovery - that must not be overlooked when building a production-ready application.

> **Garcia, Paul Ryan R.**
> This activity helped me understand that a good system design is not only about how it works under normal conditions, but how well it holds up when a lot of users rely on it at once. Knowing that the app depends on two layers of detection made me realize both layers need to stay fast and accurate even when requests pile up, or the whole purpose of quick protection breaks down.

> **Padilla, Apollo Justine F.**
> Going through this activity taught me why it is important to first understand what normal usage looks like before figuring out what happens when that usage spikes. It helped me see that not everything is checked the same way - some checks are quick and light, while others take more processing - and that difference matters a lot once traffic increases.

> **Pili, Russel Jhon O.**
> Considering all the aspects associated with this activity, I have realized that I should give additional attention to the reliability of the process, since we now understand how many requests will go directly into the Random Forest system without being analyzed locally. An increase in users will create an influx of data which must be processed by the AI, meaning significant slowdowns. Cache and database recovery speed plays an equally important role in maintaining system functionality.

> **Salamat, Mike Angelo P.**
> Through this stress testing proposal, I discovered that stress testing is not merely a bug-hunting exercise, but a vital benchmarking tool. Evaluating our Python Flask backend under simulated load transformed our understanding of system capacity - providing empirical data on latency, thread saturation, and recovery times that will directly inform our future architectural and scaling decisions.

---

## Appendix A - API Reference for Test Scripts

| Endpoint | Method | Request Body | Success Response |
|----------|--------|-------------|-----------------|
| `/` | GET | None | `"C-SEC Flask Server is LIVE and running!"` |
| `/analyze-link` | POST | `{"url": "https://example.com"}` | `{"verdict": "Safe", "protocol": "Whitelist Protocol", "confidence": 100.0, "sentinel_analysis": "...", "status": "success"}` |
| `/gemini-chat` | POST | `{"message": "...", "history": [...]}` | `{"response": "...", "status": "success"}` |

## Appendix B - Detection Gate Performance Estimates

| Gate | Protocol | Estimated Latency | When Triggered |
|------|----------|------------------|----------------|
| Gate 1 | Blacklist Check | ~1 ms | URL found in `blacklist_urls` in-memory set |
| Gate 2 | Whitelist Check | ~1 ms | Domain found in `whitelist_domains` in-memory set |
| Gate 2.5 | Levenshtein Typosquatting | ~5-15 ms | Domain within edit-distance 2 of 17 protected domains |
| Gate 3 | Random Forest AI (111 features) | ~50-300 ms | URL passes all prior gates |
| Gate 4 | Gemini Explanation Engine | ~1,000-3,000 ms | Always called after Gate 3 (including whitelist hits) |

---

*Document prepared by Group No. 5 (CSEC) - IT31S3*
*IT 009 - Systems Integration and Architecture 1*
*Technological Institute of the Philippines - Quezon City*
*September 2026*
