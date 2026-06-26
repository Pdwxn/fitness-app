import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
timeout = 120
graceful_timeout = 30
keepalive = 5
worker_class = "sync"
