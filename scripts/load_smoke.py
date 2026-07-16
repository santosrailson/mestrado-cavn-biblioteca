#!/usr/bin/env python3
"""Teste de carga seguro para endpoint somente leitura.

Uso local, por exemplo:
  ./scripts/load_smoke.py --url http://127.0.0.1:8000/api/v1/health/live/ \
    --requests 200 --workers 20

O script não chama endpoints de escrita e não envia dados pessoais. Para
cenários representativos de produção, a execução deve ser autorizada e
agendada fora do horário de uso.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def request_once(url: str, timeout: float) -> dict[str, float | int | str]:
    started = time.perf_counter()
    request = Request(url, method="GET", headers={"User-Agent": "cavn-load-smoke/1.0"})
    try:
        with urlopen(request, timeout=timeout) as response:
            response.read(1024)
            status = response.status
            error = ""
    except (HTTPError, URLError, TimeoutError) as exc:
        status = getattr(exc, "code", 0) or 0
        error = type(exc).__name__
    return {
        "status": status,
        "duration_ms": (time.perf_counter() - started) * 1000,
        "error": error,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--url", default="http://127.0.0.1:8000/api/v1/health/live/", help="GET somente leitura"
    )
    parser.add_argument("--requests", type=int, default=100)
    parser.add_argument("--workers", type=int, default=10)
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument("--max-p95-ms", type=float, default=300.0)
    args = parser.parse_args()

    if args.requests < 1 or args.workers < 1:
        parser.error("requests e workers devem ser positivos")

    samples: list[dict[str, float | int | str]] = []
    with ThreadPoolExecutor(max_workers=min(args.workers, args.requests)) as executor:
        futures = [executor.submit(request_once, args.url, args.timeout) for _ in range(args.requests)]
        for future in as_completed(futures):
            samples.append(future.result())

    durations = sorted(float(sample["duration_ms"]) for sample in samples)
    p95 = durations[max(0, int(len(durations) * 0.95) - 1)]
    failures = [sample for sample in samples if int(sample["status"]) != 200]
    report = {
        "url": args.url,
        "requests": len(samples),
        "successes": len(samples) - len(failures),
        "failures": len(failures),
        "latency_ms": {
            "min": round(min(durations), 2),
            "mean": round(statistics.mean(durations), 2),
            "p95": round(p95, 2),
            "max": round(max(durations), 2),
        },
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures or p95 > args.max_p95_ms else 0


if __name__ == "__main__":
    raise SystemExit(main())
