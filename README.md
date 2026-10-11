# Astra AI
### Satellite Health Monitoring & Orbital Intelligence

Astra AI is a satellite health monitoring and predictive intelligence platform designed to bring spacecraft telemetry analysis, anomaly detection and orbital information into one workspace.

Spacecraft generate continuous streams of telemetry, while satellite operators need a clear way to inspect changing signals, investigate unusual behaviour and understand the status of their assets. Astra AI aims to make these workflows easier to explore through a unified, visual interface.

## Overview

Astra AI brings together two related areas of satellite intelligence:

- **Telemetry health monitoring:** Analyses multivariate time-series data to highlight unusual patterns and potential anomalies that may require further investigation.
- **Orbital intelligence:** Presents satellite identification, orbital information, movement and related metadata through an interactive dashboard.

The platform is designed to help users move from raw information to a more understandable view of satellite behaviour and potential operational risks.

## Core Capabilities

### 1. Telemetry Anomaly Analysis

Satellite telemetry can contain noisy signals, changing trends and relationships across multiple channels. Astra AI is designed to help identify unusual behaviour in these time series.

The submitted project workflow describes an 18-channel telemetry analysis process that produces temporal change-point or anomaly scores for visual inspection.

Key areas include:
- Multichannel time-series monitoring
- Identification of unusual signal patterns
- Visual exploration of anomaly scores and changes over time
- Investigation of potentially abnormal telemetry behaviour

An anomaly score is an indicator for further investigation, not proof that a spacecraft has failed.

### 2. Satellite and Orbital Intelligence

Astra AI also brings satellite information into a visual interface to make individual objects and fleet-level information easier to explore.

The described workflow includes:
- Satellite lookup using NORAD catalogue identifiers
- Orbital position and movement information
- Satellite metadata and identification
- Interactive three-dimensional visualisation
- A dashboard for exploring satellite and fleet information

The availability and freshness of orbital information depend on the connected data source.

### 3. Predictive Health Monitoring

Astra AI's broader goal is to support predictive satellite maintenance by helping users examine telemetry trends, investigate potential anomalies and explore health-related indicators, including remaining useful life (RUL) estimates where supported by the configured model.

Predictions should be interpreted alongside source-data quality, model assumptions and operational context.

## How It Works

At a high level, the workflow is:

1. **Collect or access data** from the relevant telemetry and orbital-information sources.
2. **Analyse telemetry** to identify unusual temporal patterns and potential anomalies.
3. **Organise the results** into understandable charts, indicators and dashboard views.
4. **Explore satellite information** through identification, metadata and orbital visualisation.
5. **Investigate findings** to support further technical assessment.

The output depends on the availability of the relevant data sources and configured services. The dashboard should not be interpreted as a replacement for validated spacecraft operations procedures.

## Technology Stack

The web application uses the following technologies:

- **React** — component-based user interface
- **TypeScript** — typed application code
- **Vite** — development server and production build tooling
- **Tailwind CSS** — styling
- **shadcn/ui and Radix UI** — interface components
- **Three.js, React Three Fiber and Drei** — three-dimensional visualisation
- **Recharts** — data visualisation
- **Supabase JavaScript client** — application integration with Supabase services

The repository contains the web application and its associated project configuration. Any separately hosted analysis model, telemetry API or external data service must be configured and available for the corresponding functionality to operate.

## Getting Started

### Prerequisites

Install the following before running the application:

- Git
- Node.js with npm
- Access to the relevant Supabase project if using Supabase-backed functionality

### 1. Clone the repository

```bash
git clone https://github.com/Utkarsh1213108/Astra-AI.git
cd Astra-AI
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a local file named `.env.local` in the project root and add the Supabase settings required by the application:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Replace the example values with the appropriate values from your own Supabase project.

Do not commit `.env.local`, passwords, service-role keys or other private credentials to the repository. Frontend variables prefixed with `VITE_` are included in the client-side application; only use values intended to be public.

If a feature relies on an additional externally hosted API or analysis service, configure it according to the relevant application code and the service's documentation.

### 4. Start the development server

```bash
npm run dev
```

Open the local address printed by Vite in your terminal. The default development address is usually:

```text
http://localhost:5173
```

### 5. Build for production

```bash
npm run build
```

### 6. Run available checks

To run the project's lint command:

```bash
npm run lint
```

To run the configured test suite:

```bash
npm test
```

These commands are provided by the repository's package configuration. A successful build or test command should be verified in the local environment before claiming that the application passes all checks.

## Repository Structure

```text
Astra-AI/
├── public/                     # Static assets
├── src/                        # React and TypeScript application
│   └── integrations/
│       └── supabase/           # Supabase client and related types
├── supabase/                   # Supabase-related project files
├── index.html                  # Application entry HTML
├── package.json                # Dependencies and scripts
├── package-lock.json           # Locked npm dependency tree
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── README.md                   # Project documentation
```

## Demo

**Project walkthrough:** [Watch the Astra AI demo on YouTube](https://youtu.be/id42qc_Mg4w)

**Source code:** [github.com/Utkarsh1213108/Astra-AI](https://github.com/Utkarsh1213108/Astra-AI)

## Data, Reliability and Limitations

Astra AI is intended to support the analysis and visual exploration of satellite information. Its outputs depend on the quality, completeness and availability of the underlying data and integrations.

Anomaly detection and predictive indicators should be treated as decision-support information. They require appropriate validation before being used in operational decisions.

## Future Development

Potential areas for further development include:

- Improving anomaly detection and model evaluation
- Expanding telemetry-data support
- Improving orbital visualisation and fleet-level analysis
- Adding reproducible evaluation datasets and documented benchmarks
- Strengthening integration reliability, testing and deployment documentation

## Contributing

Contributions, issue reports and suggestions are welcome. Please describe the proposed change clearly and include relevant reproduction steps or test results when reporting a problem.

## License

This project is distributed under the MIT License. See the [`LICENSE`](LICENSE) file for the applicable terms.
