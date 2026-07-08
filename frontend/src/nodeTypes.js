// Node type catalog: labels, default params, and the fields shown in the
// parameters panel. Params are stored now for the Phase 2 simulation engine
// but are not computed on here.

export const NODE_TYPES = {
  client: {
    label: 'Client',
    defaultParams: {
      request_rate: 100,
    },
    fields: [
      { key: 'request_rate', label: 'Request rate (λ, req/s)', type: 'number', step: 1, min: 0 },
    ],
  },
  loadBalancer: {
    label: 'Load Balancer',
    defaultParams: {
      replicas: 2,
      unit_cost: 0.05,
      availability: 0.999,
    },
    fields: [
      { key: 'replicas', label: 'Replicas', type: 'number', step: 1, min: 1 },
      { key: 'unit_cost', label: 'Unit cost ($/hr)', type: 'number', step: 0.01, min: 0 },
      { key: 'availability', label: 'Availability (0..1)', type: 'number', step: 0.001, min: 0, max: 1 },
    ],
  },
  service: {
    label: 'Service (API)',
    defaultParams: {
      service_rate: 200,
      replicas: 3,
      availability: 0.999,
      unit_cost: 0.1,
    },
    fields: [
      { key: 'service_rate', label: 'Service rate (μ, req/s)', type: 'number', step: 1, min: 0 },
      { key: 'replicas', label: 'Replicas', type: 'number', step: 1, min: 1 },
      { key: 'availability', label: 'Availability (0..1)', type: 'number', step: 0.001, min: 0, max: 1 },
      { key: 'unit_cost', label: 'Unit cost ($/hr)', type: 'number', step: 0.01, min: 0 },
    ],
  },
  cache: {
    label: 'Cache',
    defaultParams: {
      hit_ratio: 0.8,
      service_rate: 1000,
      unit_cost: 0.02,
      availability: 0.999,
    },
    fields: [
      { key: 'hit_ratio', label: 'Hit ratio (0..1)', type: 'number', step: 0.01, min: 0, max: 1 },
      { key: 'service_rate', label: 'Service rate (μ, req/s)', type: 'number', step: 1, min: 0 },
      { key: 'unit_cost', label: 'Unit cost ($/hr)', type: 'number', step: 0.01, min: 0 },
      { key: 'availability', label: 'Availability (0..1)', type: 'number', step: 0.001, min: 0, max: 1 },
    ],
  },
  database: {
    label: 'Database',
    defaultParams: {
      service_rate: 150,
      replicas: 2,
      availability: 0.9999,
      unit_cost: 0.2,
    },
    fields: [
      { key: 'service_rate', label: 'Service rate (μ, req/s)', type: 'number', step: 1, min: 0 },
      { key: 'replicas', label: 'Replicas', type: 'number', step: 1, min: 1 },
      { key: 'availability', label: 'Availability (0..1)', type: 'number', step: 0.001, min: 0, max: 1 },
      { key: 'unit_cost', label: 'Unit cost ($/hr)', type: 'number', step: 0.01, min: 0 },
    ],
  },
}

export const PALETTE_ORDER = ['client', 'loadBalancer', 'service', 'cache', 'database']