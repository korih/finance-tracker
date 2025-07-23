# 📈 Finance Data Ingestion & Job Scheduler

This is a **Java-based personal finance data ingestion app** designed to pull data from APIs (e.g. Reddit, Twitter), scrape websites, and process webhook events. The system supports **scheduled and ad-hoc jobs**, handles **API rate limiting concerns**, and stores data for downstream use in machine learning or analytics pipelines (e.g. Spark).

---

## 🧩 Project Overview

This application is intended to:

* **Ingest financial data** from APIs, webhooks, and web scrapers.
* Use **Quartz Scheduler** to run scheduled (cron) or ad-hoc jobs.
* Use **RabbitMQ** to dispatch and handle jobs asynchronously.
* Store structured and unstructured data in **PostgreSQL** and file system.
* Be lightweight, modular, and extensible.
* Provide a solid foundation for future integration with **Apache Spark**, **Airflow**, or other analytics tools.

---

## ⚙️ Tech Stack

| Layer             | Tech                          | Purpose                          |
| ----------------- | ----------------------------- | -------------------------------- |
| Backend Framework | Spring Boot                   | REST APIs, DI, scheduling, etc.  |
| Scheduler         | Quartz                        | CRON and ad-hoc job scheduling   |
| Message Broker    | RabbitMQ                      | Asynchronous job dispatching     |
| Web Scraping      | Selenium (Java) or Playwright | Data scraping from non-API sites |
| Database          | PostgreSQL                    | Structured data and job metadata |
| File Storage      | Filesystem / MinIO (optional) | Raw/unstructured storage         |
| Containerization  | Docker + Docker Compose       | Local development environment    |
| Build System      | Gradle                        | Multi-module monorepo            |

---

## 📂 Monorepo Structure

```
finance-app/
├── backend/                  # Spring Boot app (APIs, scheduling, webhook receivers)
│   ├── src/main/java/com/...
│   └── resources/
├── jobs/                     # Runnable jobs (API fetchers, scrapers)
│   ├── api-fetchers/         # e.g. Reddit, Twitter
│   └── scrapers/             # Headless browser scripts
├── scheduler/                # Quartz config & job definitions
├── common/                   # Shared DTOs, configs, utils
├── storage/                  # DB schema, SQL migrations
├── docker/                   # Docker Compose, RabbitMQ/Postgres setup
├── README.md
└── build.gradle
```

---

## 🧱 Core Components

### 1. **Spring Boot Backend**

* Manages job APIs: create, trigger, list jobs.
* Accepts and routes webhook events.
* Connects to RabbitMQ for dispatching job requests.
* Runs Quartz for scheduling.

### 2. **Quartz Scheduler**

* Schedules jobs using CRON expressions or programmatically.
* Stores job metadata in memory or DB (Postgres optional).
* Triggers job logic via Spring beans or RabbitMQ messages.

### 3. **Job Workers**

* Runnable consumers for jobs (Java or Node.js):

  * Reddit/Twitter API fetchers
  * Web scrapers using Playwright or Selenium
* Workers are decoupled and run based on messages from RabbitMQ.
* Workers store results in Postgres or dump to disk (JSON, CSV, etc.)

### 4. **PostgreSQL**

* Stores:

  * Normalized data (e.g., posts, prices, trends)
  * Job logs/status
  * API token usage (optional)

### 5. **RabbitMQ**

* Lightweight broker for job queues.
* Ensures jobs are processed asynchronously and resiliently.
* Helps with rate limiting and scaling workers.

---

## 🛠️ Setup Instructions

### Prerequisites

* Java 17+
* Docker + Docker Compose
* Gradle
* Node.js (for optional Playwright scrapers)

### Run with Docker

```bash
docker-compose up --build
```

This spins up:

* RabbitMQ
* PostgreSQL
* Spring Boot app

### Build Backend

```bash
cd backend
./gradlew build
```

### Run a Sample Job

```bash
curl -X POST http://localhost:8080/api/jobs/schedule \
  -H "Content-Type: application/json" \
  -d '{
        "jobName": "redditFetchJob",
        "cron": "0 0 * * * ?"
      }'
```

---

## 🚀 Development Timeline (30 Days)

### Week 1:

* Bootstrap monorepo
* Setup Spring Boot, Quartz, RabbitMQ, Postgres
* Build `/api/jobs` to create and schedule jobs
* Implement Reddit fetcher job

### Week 2:

* Add webhook support
* Create job worker system (RabbitMQ consumers)
* Normalize and store Reddit/Twitter data

### Week 3:

* Build scraping jobs (Selenium or Playwright)
* Schedule scrapers with Quartz
* Add JSON data dumps

### Week 4:

* Add aggregation endpoint or batch job
* Polish code and modularity
* Add basic rate limit tracking
* Prepare data for Spark/ML workflows

---

## 🔐 Security & Rate Limiting

* API tokens stored in `.env` or Spring config.
* Jobs track usage (calls/day) to avoid quota exhaustion.
* Backoff/retry logic for APIs with strict limits.
* Middleware can be added to throttle outgoing requests if needed.

---

## 🧠 Future Work

* Integrate Apache Spark for analytics on raw/normalized data.
* Use Airflow for cross-job orchestration.
* Store raw data in S3 or MinIO.
* Add basic NLP sentiment analysis (Reddit/Twitter).
* Visualize data via lightweight dashboard or export to BI tool.

---

## 📚 References

* [Spring Boot](https://spring.io/projects/spring-boot)
* [Quartz Scheduler](https://www.quartz-scheduler.org/documentation/)
* [RabbitMQ Java Client](https://www.rabbitmq.com/api-guide.html)
* [Reddit API](https://www.reddit.com/dev/api/)
* [Twitter API](https://developer.twitter.com/en/docs)
* [Selenium Java](https://www.selenium.dev/documentation/)
* [Playwright](https://playwright.dev/)
* [Docker Compose](https://docs.docker.com/compose/)

---

## 📝 License

MIT License (or your preferred license)

---

Let me know if you want this turned into an actual starter repo with sample code and configs.
