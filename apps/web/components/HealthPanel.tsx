"use client";

import type { HealthResponse } from "@shared/core";
import { useEffect, useState } from "react";

export function HealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("http://localhost:3001/health")
      .then((r) => r.json())
      .then((d) => setData(d));
  }, []);

  return (
    <section>
      <h2>Health</h2>
      <pre data-testid="health-json">
        {data ? JSON.stringify(data) : "loading"}
      </pre>
    </section>
  );
}
