// Preset architectures: complete, pre-connected graphs a new visitor can load
// with one click. Each preset is plain data — a graph in the same shape the
// backend Graph model expects (nodes/edges/params) — so it's easy to tune.
// Loading a preset just replaces canvas state and re-runs /simulate; no math
// lives here.

export const PRESETS = [
  {
    id: 'simple-monolith',
    label: 'Simple Monolith',
    description: 'Client -> Service -> Database. The database is the bottleneck.',
    graph: {
      nodes: [
        {
          id: 'client',
          type: 'client',
          label: 'Client',
          params: { request_rate: 100 },
        },
        {
          id: 'service',
          type: 'service',
          label: 'Service',
          params: { service_rate: 150, replicas: 1, availability: 0.999, unit_cost: 0.1 },
        },
        {
          id: 'database',
          type: 'database',
          label: 'Database',
          params: { service_rate: 110, replicas: 1, availability: 0.999, unit_cost: 0.2 },
        },
      ],
      edges: [
        { id: 'client-service', source: 'client', target: 'service' },
        { id: 'service-database', source: 'service', target: 'database' },
      ],
    },
  },
  {
    id: 'cached-web-app',
    label: 'Cached Web App',
    description: 'Client -> LB -> Service -> Cache -> Database. Caching keeps the database comfortable.',
    graph: {
      nodes: [
        {
          id: 'client',
          type: 'client',
          label: 'Client',
          params: { request_rate: 300 },
        },
        {
          id: 'lb',
          type: 'loadBalancer',
          label: 'Load Balancer',
          params: { replicas: 2, unit_cost: 0.05, availability: 0.999 },
        },
        {
          id: 'service',
          type: 'service',
          label: 'Service',
          params: { service_rate: 200, replicas: 2, availability: 0.999, unit_cost: 0.1 },
        },
        {
          id: 'cache',
          type: 'cache',
          label: 'Cache',
          params: { hit_ratio: 0.85, service_rate: 1000, unit_cost: 0.02, availability: 0.999 },
        },
        {
          id: 'database',
          type: 'database',
          label: 'Database',
          params: { service_rate: 150, replicas: 1, availability: 0.999, unit_cost: 0.2 },
        },
      ],
      edges: [
        { id: 'client-lb', source: 'client', target: 'lb' },
        { id: 'lb-service', source: 'lb', target: 'service' },
        { id: 'service-cache', source: 'service', target: 'cache' },
        { id: 'cache-database', source: 'cache', target: 'database' },
      ],
    },
  },
  {
    id: 'microservices',
    label: 'Microservices',
    description: 'Client -> LB -> two parallel Services -> shared Database. The shared database is the bottleneck.',
    graph: {
      nodes: [
        {
          id: 'client',
          type: 'client',
          label: 'Client',
          params: { request_rate: 400 },
        },
        {
          id: 'lb',
          type: 'loadBalancer',
          label: 'Load Balancer',
          params: { replicas: 2, unit_cost: 0.05, availability: 0.999 },
        },
        {
          id: 'service-a',
          type: 'service',
          label: 'Service A',
          params: { service_rate: 250, replicas: 1, availability: 0.999, unit_cost: 0.1 },
        },
        {
          id: 'service-b',
          type: 'service',
          label: 'Service B',
          params: { service_rate: 250, replicas: 1, availability: 0.999, unit_cost: 0.1 },
        },
        {
          id: 'database',
          type: 'database',
          label: 'Database',
          params: { service_rate: 220, replicas: 2, availability: 0.9999, unit_cost: 0.2 },
        },
      ],
      edges: [
        { id: 'client-lb', source: 'client', target: 'lb' },
        { id: 'lb-service-a', source: 'lb', target: 'service-a' },
        { id: 'lb-service-b', source: 'lb', target: 'service-b' },
        { id: 'service-a-database', source: 'service-a', target: 'database' },
        { id: 'service-b-database', source: 'service-b', target: 'database' },
      ],
    },
  },
]
