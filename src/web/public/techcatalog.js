// The technologies an architecture is drawn with: an icon, what each one is and what it could be
// replaced with. Shared by the browser (Architecture view, component dialog) and the server
// (wcraft/specs/ARCHITECTURE.md, "Technologies"). A component's `tech` text is matched against the names and
// aliases ("Node 22 · Fastify · PostgreSQL 16" → Node.js, Fastify, PostgreSQL).
// Icons: brand marks from Simple Icons (CC0, techicons.js), a lettered badge where a brand has none
// there, and generic glyphs (database, queue, function…) for cloud services and to fill the gaps.
import { BRAND } from './techicons.js';

export const CATEGORIES = [
  ['generic', 'Generic'], ['lang', 'Languages & runtimes'], ['web', 'Front end & mobile'], ['api', 'Back-end frameworks'],
  ['db', 'Databases'], ['cache', 'Caches'], ['search', 'Search & vectors'], ['msg', 'Messaging & streaming'], ['store', 'File & object storage'],
  ['cloud', 'Cloud providers'], ['aws', 'AWS services'], ['azure', 'Azure services'], ['gcp', 'Google Cloud services'], ['host', 'Hosting & platforms'],
  ['ops', 'Containers & orchestration'], ['net', 'Network, edge & gateways'], ['auth', 'Identity & secrets'], ['pay', 'Payments'],
  ['notify', 'Email, SMS & notifications'], ['ai', 'AI & ML'], ['obs', 'Observability'], ['ci', 'CI/CD & infrastructure'], ['data', 'Data & analytics'],
  ['jobs', 'Jobs & workflows'], ['cms', 'CMS & back-office'],
];

// Generic glyphs (24×24, stroked with currentColor).
const G = {
  server: '<rect x="4" y="3.5" width="16" height="7" rx="1.5"/><rect x="4" y="13.5" width="16" height="7" rx="1.5"/><path d="M8 7h.01M8 17h.01"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  cache: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M13 9l-3 5h4l-3 5"/>',
  queue: '<rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="10" rx="1"/><path d="M17 12h4M19 10l2 2-2 2"/>',
  stream: '<path d="M3 8c3 0 3-3 6-3s3 3 6 3 3-3 6-3M3 13c3 0 3-3 6-3s3 3 6 3 3-3 6-3M3 18c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
  bucket: '<path d="M4 6h16l-2 14H6z"/><ellipse cx="12" cy="6" rx="8" ry="2"/>',
  fn: '<path d="M7 20c3 0 3-16 6-16M6 10h7M14 13l5 7M19 13l-5 7"/>',
  container: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  cluster: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>',
  cdn: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
  lb: '<circle cx="5" cy="12" r="2"/><path d="M7 12h4M11 12l5-6h3M11 12l5 6h3M11 12h8"/>',
  gateway: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 12h8M13 9l3 3-3 3M3 9h3M3 15h3"/>',
  auth: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2"/>',
  secret: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
  push: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  warehouse: '<path d="M3 9l9-5 9 5v11H3z"/><path d="M7 20v-7h10v7M7 16h10"/>',
  ai: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  vector: '<circle cx="6" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="18" cy="14" r="2"/><path d="M7.5 15.5L10.6 8.6M13.7 8.3l3 4.3M8 17l8-2.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  worker: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  monitor: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  logs: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6.5 6.5h.01M9 6.5h.01"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.3 2.2 4 5"/>',
  agent: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4M9.5 13h.01M14.5 13h.01M9.5 16.5h5M2.5 12v3M21.5 12v3"/>',
  external: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M13 3h8v8M21 3l-9 9"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  dns: '<circle cx="12" cy="12" r="9"/><path d="M8 9h8M8 15h8M12 9v6"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>',
  webhook: '<circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><circle cx="12" cy="7" r="2.5"/><path d="M10.8 9.3L8 14.8M13.2 9.3L16 14.8M9.5 17h5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  api: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/>',
  mcp: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/><circle cx="12" cy="12" r="2"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><path d="M9 6h6M18 9v6"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  cms: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  git: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 8v8M18 10c0 4-6 3-11 6"/>',
};
export const GLYPHS = Object.keys(G);

// Badges for brands without a mark in the icon set: letters on the brand's colour.
const PROVIDER = { aws: ['aws', '#FF9900', '#232F3E'], azure: ['Az', '#0078D4', '#fff'], gcp: ['GC', '#4285F4', '#fff'] };

/** id, name, category, what it is, alternatives (catalog ids, or plain names), { si: simple-icons key, mono: [letters, bg, fg], g: glyph, p: provider, aka: [aliases] } */
const E = [];
const t = (id, name, cat, desc, alts = [], o = {}) => E.push({ id, name, cat, desc, alts, ...o });

// ---- generic: fill the gaps, one per kind of block
t('g-server', 'Server', 'generic', 'A process that serves requests (an app server, a back end).', [], { g: 'server', aka: ['server', 'backend', 'back end', 'app server', 'service', 'microservice'] });
t('g-database', 'Database', 'generic', 'Where the data is kept.', [], { g: 'database', aka: ['database', 'db', 'sql database', 'relational database'] });
t('g-cache', 'Cache', 'generic', 'Fast, short-lived copies of data to answer quicker.', [], { g: 'cache', aka: ['cache', 'in-memory cache', 'key-value store'] });
t('g-queue', 'Message queue', 'generic', 'Holds work or events until a consumer takes them.', [], { g: 'queue', aka: ['queue', 'message queue', 'job queue', 'message broker', 'broker'] });
t('g-stream', 'Event stream', 'generic', 'An ordered, replayable log of events.', [], { g: 'stream', aka: ['event stream', 'stream', 'event bus', 'events'] });
t('g-bucket', 'Object storage', 'generic', 'Files and blobs, addressed by key.', [], { g: 'bucket', aka: ['object storage', 'blob storage', 'file storage', 'storage', 'bucket'] });
t('g-fn', 'Serverless function', 'generic', 'Code run on demand, billed per call.', [], { g: 'fn', aka: ['serverless', 'function', 'lambda function', 'faas', 'edge function'] });
t('g-container', 'Container', 'generic', 'An app packaged with its runtime.', [], { g: 'container', aka: ['container', 'containers'] });
t('g-cluster', 'Cluster', 'generic', 'Machines run together as one.', [], { g: 'cluster', aka: ['cluster', 'orchestrator'] });
t('g-cdn', 'CDN', 'generic', 'Serves static files from close to the user.', [], { g: 'cdn', aka: ['cdn', 'content delivery network', 'edge'] });
t('g-lb', 'Load balancer', 'generic', 'Spreads traffic over several instances.', [], { g: 'lb', aka: ['load balancer', 'lb', 'reverse proxy', 'proxy'] });
t('g-gateway', 'API gateway', 'generic', 'One entry point for APIs: routing, auth, limits.', [], { g: 'gateway', aka: ['api gateway', 'gateway', 'bff'] });
t('g-api', 'HTTP API', 'generic', 'A web API (REST, GraphQL, RPC).', [], { g: 'api', aka: ['http api', 'rest', 'rest api', 'api', 'json api', 'openapi'] });
t('g-mcp', 'MCP server', 'generic', 'Tools exposed to AI agents over the Model Context Protocol.', [], { g: 'mcp', aka: ['mcp', 'mcp server', 'model context protocol'] });
t('g-auth', 'Identity provider', 'generic', 'Sign-in, accounts and tokens.', [], { g: 'auth', aka: ['auth', 'identity', 'identity provider', 'idp', 'sso', 'login'] });
t('g-secret', 'Secrets', 'generic', 'Keys and passwords kept out of the code.', [], { g: 'secret', aka: ['secrets', 'secret manager', 'vault', 'kms'] });
t('g-mail', 'Email', 'generic', 'Sends (or receives) email.', [], { g: 'mail', aka: ['email', 'mail', 'smtp', 'transactional email'] });
t('g-sms', 'SMS', 'generic', 'Text messages to phones.', [], { g: 'sms', aka: ['sms', 'text messages'] });
t('g-push', 'Push notifications', 'generic', 'Notifications to apps and browsers.', [], { g: 'push', aka: ['push', 'push notifications', 'notifications'] });
t('g-search', 'Search engine', 'generic', 'Full-text search over the data.', [], { g: 'search', aka: ['search', 'search engine', 'full-text search'] });
t('g-vector', 'Vector database', 'generic', 'Finds similar items by embedding.', [], { g: 'vector', aka: ['vector database', 'vector db', 'vector store', 'embeddings'] });
t('g-analytics', 'Analytics', 'generic', 'Measures how the product is used.', [], { g: 'analytics', aka: ['analytics', 'product analytics', 'tracking'] });
t('g-warehouse', 'Data warehouse', 'generic', 'Data gathered for reporting and analysis.', [], { g: 'warehouse', aka: ['data warehouse', 'warehouse', 'data lake', 'lakehouse'] });
t('g-ai', 'AI model', 'generic', 'A language or ML model called by the product.', [], { g: 'ai', aka: ['llm', 'ai', 'ai model', 'model', 'ml model', 'machine learning'] });
t('g-scheduler', 'Scheduler', 'generic', 'Runs jobs at set times (cron).', [], { g: 'clock', aka: ['cron', 'scheduler', 'scheduled jobs'] });
t('g-worker', 'Background worker', 'generic', 'Does slow work outside the request.', [], { g: 'worker', aka: ['worker', 'workers', 'background jobs', 'jobs'] });
t('g-workflow', 'Workflow engine', 'generic', 'Long, multi-step processes with retries.', [], { g: 'workflow', aka: ['workflow', 'workflow engine', 'orchestration', 'saga'] });
t('g-monitor', 'Monitoring', 'generic', 'Metrics, alerts and uptime.', [], { g: 'monitor', aka: ['monitoring', 'metrics', 'alerting', 'uptime'] });
t('g-logs', 'Logging', 'generic', 'Collected logs and traces.', [], { g: 'logs', aka: ['logs', 'logging', 'tracing', 'traces'] });
t('g-browser', 'Web app', 'generic', 'Runs in the browser.', [], { g: 'browser', aka: ['web', 'web app', 'browser', 'spa', 'website', 'pwa'] });
t('g-mobile', 'Mobile app', 'generic', 'An iOS or Android app.', [], { g: 'mobile', aka: ['mobile', 'mobile app', 'native app'] });
t('g-desktop', 'Desktop app', 'generic', 'An app installed on a computer.', [], { g: 'desktop', aka: ['desktop', 'desktop app'] });
t('g-cli', 'Command line', 'generic', 'A terminal tool.', [], { g: 'terminal', aka: ['cli', 'command line', 'terminal'] });
t('g-user', 'People', 'generic', 'The people who use the product.', [], { g: 'users', aka: ['people', 'users', 'customers', 'admins'] });
t('g-agent', 'AI agent', 'generic', 'Software that acts on its own, calling tools.', [], { g: 'agent', aka: ['agent', 'agents', 'ai agent', 'ai agents', 'bot'] });
t('g-external', 'External system', 'generic', 'A system run by someone else.', [], { g: 'external', aka: ['external', 'third party', 'third-party', 'partner api', 'saas'] });
t('g-payment', 'Payments', 'generic', 'Takes and refunds payments.', [], { g: 'card', aka: ['payments', 'payment provider', 'psp', 'billing'] });
t('g-webhook', 'Webhooks', 'generic', 'Calls another system when something happens.', [], { g: 'webhook', aka: ['webhook', 'webhooks', 'callbacks'] });
t('g-dns', 'DNS', 'generic', 'Turns names into addresses.', [], { g: 'dns', aka: ['dns', 'domain'] });
t('g-firewall', 'Firewall / WAF', 'generic', 'Filters traffic before it reaches the app.', [], { g: 'shield', aka: ['firewall', 'waf', 'ddos protection'] });
t('g-cloud', 'Cloud', 'generic', 'Infrastructure rented from a provider.', [], { g: 'cloud', aka: ['cloud', 'vpc', 'network'] });
t('g-flags', 'Feature flags', 'generic', 'Turns features on and off without a deploy.', [], { g: 'flag', aka: ['feature flags', 'flags', 'feature toggles'] });
t('g-cms', 'CMS', 'generic', 'Content edited by non-developers.', [], { g: 'cms', aka: ['cms', 'content management', 'back office', 'backoffice', 'admin panel'] });
t('g-maps', 'Maps', 'generic', 'Maps, places and routes.', [], { g: 'map', aka: ['maps', 'geocoding', 'routing'] });
t('g-media', 'Media processing', 'generic', 'Images and video resized, transcoded, served.', [], { g: 'video', aka: ['media', 'video', 'images', 'image processing', 'transcoding'] });
t('g-chat', 'Chat / realtime', 'generic', 'Live updates and messages (WebSocket, SSE).', [], { g: 'chat', aka: ['realtime', 'websocket', 'websockets', 'sse', 'chat'] });
t('g-file', 'Files', 'generic', 'Files on a disk or a share.', [], { g: 'file', aka: ['files', 'filesystem', 'disk', 'nfs', 'sftp'] });

// ---- languages & runtimes
t('python', 'Python', 'lang', 'General-purpose language, strong for data, AI and back ends.', ['nodejs', 'go', 'java', 'ruby'], { si: 'python', aka: ['python', 'py', 'python3', 'cpython'] });
t('nodejs', 'Node.js', 'lang', 'JavaScript on the server, event-driven.', ['bun', 'deno', 'python', 'go'], { si: 'nodedotjs', aka: ['node', 'nodejs', 'node.js'] });
t('bun', 'Bun', 'lang', 'Fast JavaScript runtime, bundler and package manager.', ['nodejs', 'deno'], { si: 'bun', aka: ['bun'] });
t('deno', 'Deno', 'lang', 'Secure TypeScript/JavaScript runtime.', ['nodejs', 'bun'], { si: 'deno', aka: ['deno'] });
t('typescript', 'TypeScript', 'lang', 'JavaScript with types.', ['javascript'], { si: 'typescript', aka: ['typescript', 'ts'] });
t('javascript', 'JavaScript', 'lang', 'The language of the web.', ['typescript'], { si: 'javascript', aka: ['javascript', 'js', 'ecmascript'] });
t('go', 'Go', 'lang', 'Compiled, simple, good at concurrent network services.', ['rust', 'java', 'nodejs'], { si: 'go', aka: ['go', 'golang'] });
t('rust', 'Rust', 'lang', 'Compiled, memory-safe, very fast.', ['go', 'cpp'], { si: 'rust', aka: ['rust'] });
t('java', 'Java', 'lang', 'JVM language, the enterprise mainstay.', ['kotlin', 'csharp', 'go'], { si: 'openjdk', aka: ['java', 'jvm', 'openjdk'] });
t('kotlin', 'Kotlin', 'lang', 'Modern JVM language, also for Android.', ['java', 'swift'], { si: 'kotlin', aka: ['kotlin'] });
t('csharp', 'C# / .NET', 'lang', 'Microsoft\'s language and platform.', ['java', 'go'], { si: 'dotnet', aka: ['c#', 'csharp', '.net', 'dotnet', 'asp.net', 'asp.net core'] });
t('php', 'PHP', 'lang', 'Web scripting language behind much of the web.', ['python', 'nodejs', 'ruby'], { si: 'php', aka: ['php'] });
t('ruby', 'Ruby', 'lang', 'Expressive scripting language.', ['python', 'php'], { si: 'ruby', aka: ['ruby'] });
t('elixir', 'Elixir', 'lang', 'Functional language on the Erlang VM, built for concurrency.', ['go', 'nodejs'], { si: 'elixir', aka: ['elixir', 'erlang', 'beam'] });
t('scala', 'Scala', 'lang', 'Functional and object JVM language.', ['kotlin', 'java'], { si: 'scala', aka: ['scala'] });
t('swift', 'Swift', 'lang', 'Apple\'s language for iOS and macOS.', ['kotlin', 'flutter'], { si: 'swift', aka: ['swift', 'swiftui'] });
t('dart', 'Dart', 'lang', 'Language behind Flutter.', ['typescript'], { si: 'dart', aka: ['dart'] });
t('cpp', 'C++', 'lang', 'Low-level, high-performance language.', ['rust', 'go'], { si: 'cplusplus', aka: ['c++', 'cpp'] });
t('wasm', 'WebAssembly', 'lang', 'Portable binary code for the browser and the edge.', ['javascript'], { si: 'webassembly', aka: ['webassembly', 'wasm'] });

// ---- front end & mobile
t('react', 'React', 'web', 'UI library of components.', ['vue', 'svelte', 'angular', 'solid'], { si: 'react', aka: ['react', 'react.js', 'reactjs'] });
t('nextjs', 'Next.js', 'web', 'React framework with server rendering and routing.', ['remix', 'nuxt', 'sveltekit', 'astro'], { si: 'nextdotjs', aka: ['next', 'next.js', 'nextjs'] });
t('remix', 'Remix', 'web', 'React framework built on web standards.', ['nextjs', 'sveltekit'], { si: 'remix', aka: ['remix', 'react router'] });
t('vue', 'Vue', 'web', 'Progressive UI framework.', ['react', 'svelte', 'angular'], { si: 'vuedotjs', aka: ['vue', 'vue.js', 'vuejs'] });
t('nuxt', 'Nuxt', 'web', 'Vue framework with server rendering.', ['nextjs', 'sveltekit'], { si: 'nuxt', aka: ['nuxt', 'nuxt.js'] });
t('angular', 'Angular', 'web', 'Full front-end framework by Google.', ['react', 'vue'], { si: 'angular', aka: ['angular'] });
t('svelte', 'Svelte', 'web', 'Compiled UI framework, little runtime.', ['react', 'vue', 'solid'], { si: 'svelte', aka: ['svelte'] });
t('sveltekit', 'SvelteKit', 'web', 'Svelte app framework.', ['nextjs', 'nuxt'], { si: 'svelte', aka: ['sveltekit'] });
t('solid', 'SolidJS', 'web', 'Fine-grained reactive UI library.', ['react', 'svelte'], { si: 'solid', aka: ['solid', 'solidjs'] });
t('astro', 'Astro', 'web', 'Content-first site framework, ships little JavaScript.', ['nextjs', 'Hugo'], { si: 'astro', aka: ['astro'] });
t('htmx', 'htmx', 'web', 'HTML-driven interactivity from the server.', ['react', 'alpine'], { si: 'htmx', aka: ['htmx'] });
t('alpine', 'Alpine.js', 'web', 'Small behaviour layer for HTML.', ['htmx', 'vue'], { si: 'alpinedotjs', aka: ['alpine', 'alpine.js'] });
t('vite', 'Vite', 'web', 'Front-end dev server and bundler.', ['webpack', 'esbuild'], { si: 'vite', aka: ['vite'] });
t('webpack', 'webpack', 'web', 'Module bundler.', ['vite', 'esbuild'], { si: 'webpack', aka: ['webpack'] });
t('esbuild', 'esbuild', 'web', 'Very fast bundler.', ['vite', 'webpack'], { si: 'esbuild', aka: ['esbuild'] });
t('tailwind', 'Tailwind CSS', 'web', 'Utility-first CSS.', ['bootstrap'], { si: 'tailwindcss', aka: ['tailwind', 'tailwindcss', 'tailwind css'] });
t('bootstrap', 'Bootstrap', 'web', 'CSS component framework.', ['tailwind'], { si: 'bootstrap', aka: ['bootstrap'] });
t('reactnative', 'React Native', 'web', 'Native mobile apps with React.', ['flutter', 'swift', 'kotlin'], { si: 'react', aka: ['react native', 'react-native'] });
t('expo', 'Expo', 'web', 'Tooling and services for React Native apps.', ['reactnative', 'flutter'], { si: 'expo', aka: ['expo'] });
t('flutter', 'Flutter', 'web', 'Cross-platform UI toolkit (mobile, web, desktop).', ['reactnative', 'swift', 'kotlin'], { si: 'flutter', aka: ['flutter'] });
t('ios', 'iOS', 'web', 'Apple\'s mobile platform.', ['android'], { si: 'apple', aka: ['ios', 'iphone', 'ipad'] });
t('android', 'Android', 'web', 'Google\'s mobile platform.', ['ios'], { si: 'android', aka: ['android'] });
t('electron', 'Electron', 'web', 'Desktop apps with web technologies.', ['tauri'], { si: 'electron', aka: ['electron'] });
t('tauri', 'Tauri', 'web', 'Small desktop apps with a web UI and a Rust core.', ['electron'], { si: 'tauri', aka: ['tauri'] });

// ---- back-end frameworks & API styles
t('express', 'Express', 'api', 'Minimal Node.js web framework.', ['fastify', 'nestjs', 'hono'], { si: 'express', aka: ['express', 'express.js', 'expressjs'] });
t('fastify', 'Fastify', 'api', 'Fast, schema-based Node.js web framework.', ['express', 'hono', 'nestjs'], { si: 'fastify', aka: ['fastify'] });
t('nestjs', 'NestJS', 'api', 'Structured Node.js framework (modules, DI).', ['express', 'fastify'], { si: 'nestjs', aka: ['nest', 'nestjs'] });
t('hono', 'Hono', 'api', 'Tiny web framework for every JS runtime and the edge.', ['express', 'fastify'], { si: 'hono', aka: ['hono'] });
t('fastapi', 'FastAPI', 'api', 'Python API framework with types and OpenAPI.', ['django', 'flask', 'litestar'], { si: 'fastapi', aka: ['fastapi'] });
t('django', 'Django', 'api', 'Batteries-included Python web framework.', ['fastapi', 'flask', 'rails'], { si: 'django', aka: ['django', 'django rest framework', 'drf'] });
t('flask', 'Flask', 'api', 'Minimal Python web framework.', ['fastapi', 'django'], { si: 'flask', aka: ['flask'] });
t('litestar', 'Litestar', 'api', 'Python ASGI API framework.', ['fastapi'], { mono: ['Ls', '#202235', '#EDB641'], aka: ['litestar'] });
t('spring', 'Spring Boot', 'api', 'Java application framework.', ['quarkus', 'aspnet', 'nestjs'], { si: 'spring', aka: ['spring', 'spring boot', 'springboot'] });
t('quarkus', 'Quarkus', 'api', 'Fast-starting Java framework for containers.', ['spring'], { si: 'quarkus', aka: ['quarkus'] });
t('aspnet', 'ASP.NET Core', 'api', '.NET web framework.', ['spring', 'nestjs'], { si: 'dotnet', aka: ['asp.net core web api', 'minimal api'] });
t('rails', 'Ruby on Rails', 'api', 'Convention-over-configuration Ruby framework.', ['django', 'laravel'], { si: 'rubyonrails', aka: ['rails', 'ruby on rails', 'ror'] });
t('laravel', 'Laravel', 'api', 'PHP web framework.', ['symfony', 'rails', 'django'], { si: 'laravel', aka: ['laravel'] });
t('symfony', 'Symfony', 'api', 'PHP framework and components.', ['laravel'], { si: 'symfony', aka: ['symfony'] });
t('phoenix', 'Phoenix', 'api', 'Elixir web framework with live views.', ['rails', 'django'], { si: 'phoenixframework', aka: ['phoenix', 'liveview'] });
t('gin', 'Gin', 'api', 'Go HTTP framework.', ['echo', 'fiber'], { mono: ['Gin', '#00ADD8', '#fff'], aka: ['gin'] });
t('echo', 'Echo', 'api', 'Go web framework.', ['gin', 'fiber'], { mono: ['Ec', '#00ADD8', '#fff'], aka: ['echo'] });
t('fiber', 'Fiber', 'api', 'Express-like Go framework.', ['gin', 'echo'], { mono: ['Fb', '#00ACD7', '#fff'], aka: ['fiber', 'gofiber'] });
t('axum', 'Axum', 'api', 'Rust web framework on Tokio.', ['actix'], { mono: ['Ax', '#B7410E', '#fff'], aka: ['axum'] });
t('actix', 'Actix Web', 'api', 'Fast Rust web framework.', ['axum'], { mono: ['Ac', '#B7410E', '#fff'], aka: ['actix', 'actix web', 'actix-web'] });
t('graphql', 'GraphQL', 'api', 'Query language for APIs: the client asks for exactly what it needs.', ['rest', 'trpc', 'grpc'], { si: 'graphql', aka: ['graphql', 'gql'] });
t('apollo', 'Apollo', 'api', 'GraphQL server, client and router.', ['hasura', 'graphql'], { si: 'apollographql', aka: ['apollo', 'apollo server', 'apollo graphql'] });
t('hasura', 'Hasura', 'api', 'Instant GraphQL over a database.', ['apollo', 'postgrest', 'supabase'], { si: 'hasura', aka: ['hasura'] });
t('trpc', 'tRPC', 'api', 'Type-safe API calls between TypeScript client and server.', ['graphql', 'rest'], { si: 'trpc', aka: ['trpc'] });
t('grpc', 'gRPC', 'api', 'Fast binary RPC between services (Protocol Buffers).', ['rest', 'graphql'], { mono: ['gRPC', '#244C5A', '#fff'], aka: ['grpc', 'protobuf', 'protocol buffers'] });
t('rest', 'REST', 'api', 'Resource-oriented HTTP API.', ['graphql', 'grpc', 'trpc'], { g: 'api', aka: ['rest', 'restful'] });
t('openapi', 'OpenAPI', 'api', 'Describes an HTTP API (Swagger).', ['graphql'], { si: 'openapiinitiative', aka: ['openapi', 'swagger'] });
t('socketio', 'Socket.IO', 'api', 'Realtime events over WebSocket.', ['pusher', 'ably', 'Centrifugo'], { si: 'socketdotio', aka: ['socket.io', 'socketio'] });
t('postgrest', 'PostgREST', 'api', 'REST API straight from a PostgreSQL schema.', ['hasura', 'supabase'], { mono: ['PgR', '#336791', '#fff'], aka: ['postgrest'] });
t('prisma', 'Prisma', 'api', 'Type-safe ORM for Node.js.', ['drizzle', 'typeorm', 'sqlalchemy'], { si: 'prisma', aka: ['prisma'] });
t('drizzle', 'Drizzle ORM', 'api', 'Lightweight SQL-first TypeScript ORM.', ['prisma', 'Kysely'], { si: 'drizzle', aka: ['drizzle', 'drizzle orm'] });
t('typeorm', 'TypeORM', 'api', 'ORM for TypeScript.', ['prisma', 'drizzle'], { si: 'typeorm', aka: ['typeorm'] });
t('sqlalchemy', 'SQLAlchemy', 'api', 'Python SQL toolkit and ORM.', ['Django ORM', 'prisma'], { si: 'sqlalchemy', aka: ['sqlalchemy', 'sqlmodel'] });
t('hibernate', 'Hibernate', 'api', 'Maps Java objects to SQL tables (JPA).', ['jOOQ'], { si: 'hibernate', aka: ['hibernate', 'jpa'] });

// ---- databases
t('postgres', 'PostgreSQL', 'db', 'Open-source relational database, very capable (JSON, full-text, extensions).', ['mysql', 'cockroachdb', 'sqlite', 'aws-aurora', 'neon', 'supabase'], { si: 'postgresql', aka: ['postgres', 'postgresql', 'pg', 'psql', 'pgsql'] });
t('mysql', 'MySQL', 'db', 'Widely used open-source relational database.', ['postgres', 'mariadb', 'planetscale'], { si: 'mysql', aka: ['mysql'] });
t('mariadb', 'MariaDB', 'db', 'Community fork of MySQL.', ['mysql', 'postgres'], { si: 'mariadb', aka: ['mariadb'] });
t('sqlite', 'SQLite', 'db', 'Embedded database in a single file.', ['postgres', 'duckdb', 'libsql'], { si: 'sqlite', aka: ['sqlite', 'sqlite3'] });
t('libsql', 'libSQL / Turso', 'db', 'SQLite fork, replicated at the edge.', ['sqlite', 'neon'], { si: 'turso', aka: ['turso', 'libsql'] });
t('sqlserver', 'SQL Server', 'db', 'Microsoft\'s relational database.', ['postgres', 'azure-sql'], { mono: ['SQL', '#CC2927', '#fff'], aka: ['sql server', 'mssql', 'microsoft sql server'] });
t('oracle', 'Oracle Database', 'db', 'Enterprise relational database.', ['postgres', 'sqlserver'], { mono: ['ORA', '#F80000', '#fff'], aka: ['oracle', 'oracle database', 'oracle db'] });
t('mongodb', 'MongoDB', 'db', 'Document database (JSON-like records).', ['postgres', 'couchbase', 'aws-dynamodb', 'gcp-firestore'], { si: 'mongodb', aka: ['mongo', 'mongodb', 'atlas', 'mongodb atlas'] });
t('couchbase', 'Couchbase', 'db', 'Document database with a built-in cache.', ['mongodb'], { si: 'couchbase', aka: ['couchbase'] });
t('couchdb', 'CouchDB', 'db', 'Document database that syncs (offline-first).', ['mongodb', 'PouchDB'], { si: 'apachecouchdb', aka: ['couchdb'] });
t('cassandra', 'Cassandra', 'db', 'Wide-column database for huge write volumes.', ['scylladb', 'aws-dynamodb'], { si: 'apachecassandra', aka: ['cassandra', 'apache cassandra'] });
t('scylladb', 'ScyllaDB', 'db', 'Cassandra-compatible, in C++.', ['cassandra'], { si: 'scylladb', aka: ['scylla', 'scylladb'] });
t('cockroachdb', 'CockroachDB', 'db', 'Distributed SQL, PostgreSQL-compatible.', ['postgres', 'yugabyte', 'gcp-spanner'], { si: 'cockroachlabs', aka: ['cockroach', 'cockroachdb'] });
t('yugabyte', 'YugabyteDB', 'db', 'Distributed PostgreSQL-compatible database.', ['cockroachdb'], { mono: ['Yb', '#FF6E42', '#fff'], aka: ['yugabyte', 'yugabytedb'] });
t('neo4j', 'Neo4j', 'db', 'Graph database.', ['arangodb', 'postgres'], { si: 'neo4j', aka: ['neo4j', 'graph database'] });
t('arangodb', 'ArangoDB', 'db', 'Multi-model (graph, document) database.', ['neo4j'], { si: 'arangodb', aka: ['arangodb'] });
t('influxdb', 'InfluxDB', 'db', 'Time-series database.', ['timescaledb', 'prometheus'], { si: 'influxdb', aka: ['influx', 'influxdb'] });
t('timescaledb', 'TimescaleDB', 'db', 'Time series on PostgreSQL.', ['influxdb', 'clickhouse'], { si: 'timescale', aka: ['timescale', 'timescaledb'] });
t('surrealdb', 'SurrealDB', 'db', 'Multi-model database with realtime queries.', ['postgres', 'mongodb'], { si: 'surrealdb', aka: ['surrealdb'] });
t('neon', 'Neon', 'db', 'Serverless PostgreSQL with branching.', ['supabase', 'aws-aurora', 'postgres'], { mono: ['Neon', '#00E599', '#0B1215'], aka: ['neon'] });
t('planetscale', 'PlanetScale', 'db', 'Serverless MySQL (Vitess).', ['neon', 'mysql'], { si: 'planetscale', aka: ['planetscale', 'vitess'] });
t('supabase', 'Supabase', 'db', 'PostgreSQL with auth, storage and realtime as a service.', ['firebase', 'neon', 'appwrite'], { si: 'supabase', aka: ['supabase'] });
t('firebase', 'Firebase', 'db', 'Google\'s app back end: Firestore, auth, hosting, functions.', ['supabase', 'appwrite', 'aws-amplify'], { si: 'firebase', aka: ['firebase'] });
t('appwrite', 'Appwrite', 'db', 'Open-source back end as a service.', ['supabase', 'firebase', 'pocketbase'], { si: 'appwrite', aka: ['appwrite'] });
t('pocketbase', 'PocketBase', 'db', 'Back end in one file (SQLite, auth, files).', ['supabase', 'appwrite'], { si: 'pocketbase', aka: ['pocketbase'] });

// ---- caches
t('redis', 'Redis', 'cache', 'In-memory store for cache, sessions, queues and pub/sub.', ['valkey', 'memcached', 'dragonfly', 'aws-elasticache'], { si: 'redis', aka: ['redis', 'redis cache'] });
t('valkey', 'Valkey', 'cache', 'Open-source fork of Redis (Linux Foundation).', ['redis', 'dragonfly'], { mono: ['Vk', '#6983FF', '#fff'], aka: ['valkey'] });
t('dragonfly', 'Dragonfly', 'cache', 'Redis-compatible, multi-threaded store.', ['redis', 'valkey'], { mono: ['Df', '#7B3AED', '#fff'], aka: ['dragonfly', 'dragonflydb'] });
t('memcached', 'Memcached', 'cache', 'Simple in-memory key-value cache.', ['redis'], { mono: ['Mc', '#2F7E4D', '#fff'], aka: ['memcached', 'memcache'] });
t('varnish', 'Varnish', 'cache', 'HTTP cache in front of a web server.', ['nginx', 'cloudflare'], { mono: ['Vn', '#2E4A7C', '#fff'], aka: ['varnish'] });

// ---- search & vectors
t('elasticsearch', 'Elasticsearch', 'search', 'Search and analytics engine.', ['opensearch', 'meilisearch', 'typesense', 'algolia'], { si: 'elasticsearch', aka: ['elasticsearch', 'elastic'] });
t('opensearch', 'OpenSearch', 'search', 'Open-source fork of Elasticsearch.', ['elasticsearch'], { si: 'opensearch', aka: ['opensearch'] });
t('meilisearch', 'Meilisearch', 'search', 'Fast, typo-tolerant search for apps.', ['typesense', 'algolia', 'elasticsearch'], { si: 'meilisearch', aka: ['meilisearch', 'meili'] });
t('typesense', 'Typesense', 'search', 'Open-source instant search.', ['meilisearch', 'algolia'], { mono: ['Ts', '#D52E5B', '#fff'], aka: ['typesense'] });
t('algolia', 'Algolia', 'search', 'Hosted search as a service.', ['meilisearch', 'typesense', 'elasticsearch'], { si: 'algolia', aka: ['algolia'] });
t('pgvector', 'pgvector', 'search', 'Vector search inside PostgreSQL.', ['pinecone', 'qdrant', 'weaviate'], { si: 'postgresql', aka: ['pgvector'] });
t('pinecone', 'Pinecone', 'search', 'Managed vector database.', ['qdrant', 'weaviate', 'pgvector'], { mono: ['Pc', '#000000', '#fff'], aka: ['pinecone'] });
t('qdrant', 'Qdrant', 'search', 'Open-source vector database.', ['weaviate', 'pinecone', 'pgvector'], { si: 'qdrant', aka: ['qdrant'] });
t('weaviate', 'Weaviate', 'search', 'Open-source vector database with modules.', ['qdrant', 'pinecone'], { mono: ['Wv', '#00B87C', '#fff'], aka: ['weaviate'] });
t('milvus', 'Milvus', 'search', 'Scalable vector database.', ['qdrant', 'weaviate'], { si: 'milvus', aka: ['milvus', 'zilliz'] });
t('chroma', 'Chroma', 'search', 'Embedding database for AI apps.', ['qdrant', 'pgvector'], { mono: ['Ch', '#FF6446', '#fff'], aka: ['chroma', 'chromadb'] });

// ---- messaging & streaming
t('kafka', 'Apache Kafka', 'msg', 'Distributed event log for high-volume streams.', ['redpanda', 'pulsar', 'aws-kinesis', 'azure-eventhubs', 'gcp-pubsub'], { si: 'apachekafka', aka: ['kafka', 'apache kafka', 'confluent'] });
t('redpanda', 'Redpanda', 'msg', 'Kafka-compatible streaming, no JVM.', ['kafka'], { mono: ['Rp', '#E2401B', '#fff'], aka: ['redpanda'] });
t('pulsar', 'Apache Pulsar', 'msg', 'Messaging and streaming with tiered storage.', ['kafka', 'rabbitmq'], { si: 'apachepulsar', aka: ['pulsar', 'apache pulsar'] });
t('rabbitmq', 'RabbitMQ', 'msg', 'Message broker (queues, routing).', ['aws-sqs', 'nats', 'kafka', 'azure-servicebus'], { si: 'rabbitmq', aka: ['rabbitmq', 'rabbit', 'amqp'] });
t('nats', 'NATS', 'msg', 'Lightweight messaging and streams (JetStream).', ['rabbitmq', 'kafka'], { mono: ['NATS', '#27AAE1', '#fff'], aka: ['nats', 'jetstream'] });
t('activemq', 'ActiveMQ', 'msg', 'Java message broker (JMS).', ['rabbitmq'], { mono: ['AMQ', '#D22128', '#fff'], aka: ['activemq', 'artemis'] });
t('mqtt', 'MQTT', 'msg', 'Light publish/subscribe protocol for devices.', ['nats'], { si: 'mqtt', aka: ['mqtt', 'mosquitto', 'emqx'] });
t('bullmq', 'BullMQ', 'msg', 'Job queue for Node.js on Redis.', ['celery', 'sidekiq', 'aws-sqs'], { mono: ['Bull', '#E5383B', '#fff'], aka: ['bullmq', 'bull'] });
t('celery', 'Celery', 'jobs', 'Distributed task queue for Python.', ['RQ', 'Dramatiq', 'temporal'], { si: 'celery', aka: ['celery'] });
t('sidekiq', 'Sidekiq', 'jobs', 'Background jobs for Ruby.', ['celery', 'bullmq'], { mono: ['Sk', '#B1003E', '#fff'], aka: ['sidekiq'] });
t('pusher', 'Pusher', 'msg', 'Hosted realtime channels.', ['ably', 'socketio'], { mono: ['Pu', '#300D4F', '#fff'], aka: ['pusher'] });
t('ably', 'Ably', 'msg', 'Hosted realtime messaging.', ['pusher', 'socketio'], { mono: ['Ab', '#FF5416', '#fff'], aka: ['ably'] });

// ---- storage
t('minio', 'MinIO', 'store', 'S3-compatible object storage you run yourself.', ['aws-s3', 'r2', 'ceph'], { si: 'minio', aka: ['minio'] });
t('r2', 'Cloudflare R2', 'store', 'S3-compatible storage without egress fees.', ['aws-s3', 'backblaze', 'minio'], { si: 'cloudflare', aka: ['r2', 'cloudflare r2'] });
t('backblaze', 'Backblaze B2', 'store', 'Low-cost S3-compatible storage.', ['aws-s3', 'r2', 'wasabi'], { si: 'backblaze', aka: ['backblaze', 'b2', 'backblaze b2'] });
t('wasabi', 'Wasabi', 'store', 'Hot cloud storage, flat price.', ['backblaze', 'aws-s3'], { si: 'wasabi', aka: ['wasabi'] });
t('ceph', 'Ceph', 'store', 'Distributed storage (object, block, file).', ['minio'], { si: 'ceph', aka: ['ceph'] });
t('cloudinary', 'Cloudinary', 'store', 'Image and video storage, transforms and CDN.', ['Imgix', 'aws-s3'], { si: 'cloudinary', aka: ['cloudinary'] });
t('uploadthing', 'UploadThing', 'store', 'File uploads for TypeScript apps.', ['aws-s3', 'cloudinary'], { mono: ['UT', '#E91515', '#fff'], aka: ['uploadthing'] });

// ---- cloud providers
t('aws', 'AWS', 'cloud', 'Amazon Web Services, the largest cloud provider.', ['azure', 'gcp'], { mono: PROVIDER.aws, aka: ['aws', 'amazon web services', 'amazon'] });
t('azure', 'Microsoft Azure', 'cloud', 'Microsoft\'s cloud.', ['aws', 'gcp'], { mono: PROVIDER.azure, aka: ['azure', 'microsoft azure'] });
t('gcp', 'Google Cloud', 'cloud', 'Google\'s cloud.', ['aws', 'azure'], { si: 'googlecloud', aka: ['gcp', 'google cloud', 'google cloud platform'] });
t('oci', 'Oracle Cloud', 'cloud', 'Oracle Cloud Infrastructure.', ['aws', 'azure', 'gcp'], { mono: ['OCI', '#C74634', '#fff'], aka: ['oci', 'oracle cloud'] });
t('ibmcloud', 'IBM Cloud', 'cloud', 'IBM\'s cloud, strong in regulated industries.', ['aws', 'azure'], { mono: ['IBM', '#0F62FE', '#fff'], aka: ['ibm cloud'] });
t('alibaba', 'Alibaba Cloud', 'cloud', 'Alibaba\'s cloud, strong in Asia.', ['aws', 'gcp'], { si: 'alibabacloud', aka: ['alibaba cloud', 'aliyun'] });
t('ovh', 'OVHcloud', 'cloud', 'European cloud and servers.', ['scaleway', 'hetzner', 'aws'], { si: 'ovh', aka: ['ovh', 'ovhcloud'] });
t('scaleway', 'Scaleway', 'cloud', 'European cloud.', ['ovh', 'hetzner'], { si: 'scaleway', aka: ['scaleway'] });
t('hetzner', 'Hetzner', 'cloud', 'Low-cost servers and cloud (Germany, Finland, US).', ['ovh', 'digitalocean'], { si: 'hetzner', aka: ['hetzner'] });
t('digitalocean', 'DigitalOcean', 'cloud', 'Simple cloud: droplets, managed databases, apps.', ['linode', 'hetzner', 'vultr'], { si: 'digitalocean', aka: ['digitalocean', 'digital ocean', 'droplet'] });
t('linode', 'Akamai Cloud (Linode)', 'cloud', 'Simple virtual machines.', ['digitalocean', 'vultr'], { si: 'akamai', aka: ['linode', 'akamai cloud'] });
t('vultr', 'Vultr', 'cloud', 'Cloud servers worldwide.', ['digitalocean', 'hetzner'], { si: 'vultr', aka: ['vultr'] });

// ---- AWS services (generic glyph + AWS badge)
const aws = (id, name, g, desc, alts, aka) => t(`aws-${id}`, name, 'aws', desc, alts, { g, p: 'aws', aka });
aws('ec2', 'Amazon EC2', 'server', 'Virtual machines.', ['azure-vm', 'gcp-compute', 'hetzner'], ['ec2', 'amazon ec2', 'aws ec2']);
aws('lambda', 'AWS Lambda', 'fn', 'Serverless functions.', ['azure-functions', 'gcp-functions', 'cloudflare-workers'], ['lambda', 'aws lambda']);
aws('ecs', 'Amazon ECS', 'container', 'Runs containers on AWS.', ['aws-eks', 'gcp-run', 'azure-containerapps'], ['ecs', 'amazon ecs']);
aws('fargate', 'AWS Fargate', 'container', 'Serverless containers for ECS and EKS.', ['gcp-run', 'azure-containerapps'], ['fargate', 'aws fargate']);
aws('eks', 'Amazon EKS', 'cluster', 'Managed Kubernetes.', ['gcp-gke', 'azure-aks', 'kubernetes'], ['eks', 'amazon eks']);
aws('apprunner', 'AWS App Runner', 'container', 'Containers or code as a web service.', ['gcp-run', 'azure-appservice', 'render'], ['app runner', 'aws app runner']);
aws('beanstalk', 'Elastic Beanstalk', 'server', 'Managed app platform.', ['heroku', 'azure-appservice'], ['elastic beanstalk', 'beanstalk']);
aws('s3', 'Amazon S3', 'bucket', 'Object storage.', ['gcp-storage', 'azure-blob', 'r2', 'minio'], ['s3', 'amazon s3', 'aws s3']);
aws('rds', 'Amazon RDS', 'database', 'Managed relational databases (PostgreSQL, MySQL…).', ['gcp-sql', 'azure-sql', 'neon'], ['rds', 'amazon rds', 'aws rds']);
aws('aurora', 'Amazon Aurora', 'database', 'AWS\'s MySQL/PostgreSQL-compatible database.', ['aws-rds', 'gcp-spanner', 'cockroachdb'], ['aurora', 'amazon aurora', 'aurora serverless']);
aws('dynamodb', 'Amazon DynamoDB', 'database', 'Serverless key-value and document database.', ['azure-cosmos', 'gcp-firestore', 'mongodb'], ['dynamodb', 'dynamo', 'amazon dynamodb']);
aws('elasticache', 'Amazon ElastiCache', 'cache', 'Managed Redis, Valkey or Memcached.', ['redis', 'gcp-memorystore', 'azure-redis'], ['elasticache', 'amazon elasticache', 'memorydb']);
aws('opensearch', 'Amazon OpenSearch Service', 'search', 'Managed OpenSearch.', ['elasticsearch', 'algolia'], ['amazon opensearch', 'aws opensearch']);
aws('sqs', 'Amazon SQS', 'queue', 'Managed message queues.', ['azure-servicebus', 'gcp-pubsub', 'rabbitmq'], ['sqs', 'amazon sqs']);
aws('sns', 'Amazon SNS', 'push', 'Pub/sub topics, SMS and push.', ['gcp-pubsub', 'azure-eventgrid'], ['sns', 'amazon sns']);
aws('eventbridge', 'Amazon EventBridge', 'stream', 'Event bus between services and SaaS.', ['azure-eventgrid', 'gcp-eventarc'], ['eventbridge', 'amazon eventbridge']);
aws('kinesis', 'Amazon Kinesis', 'stream', 'Real-time data streams.', ['kafka', 'azure-eventhubs', 'gcp-pubsub'], ['kinesis', 'amazon kinesis', 'msk', 'amazon msk']);
aws('stepfunctions', 'AWS Step Functions', 'workflow', 'Serverless workflows.', ['temporal', 'azure-logicapps', 'gcp-workflows'], ['step functions', 'aws step functions']);
aws('apigateway', 'Amazon API Gateway', 'gateway', 'Managed API front door.', ['azure-apim', 'gcp-apigateway', 'kong'], ['api gateway', 'amazon api gateway', 'aws api gateway']);
aws('cloudfront', 'Amazon CloudFront', 'cdn', 'AWS\'s CDN: caches and serves content from the edge.', ['cloudflare', 'fastly', 'azure-frontdoor', 'gcp-cdn'], ['cloudfront', 'amazon cloudfront']);
aws('route53', 'Amazon Route 53', 'dns', 'DNS and health checks.', ['cloudflare', 'gcp-dns'], ['route 53', 'route53']);
aws('alb', 'Elastic Load Balancing', 'lb', 'Load balancers (ALB, NLB).', ['nginx', 'gcp-lb', 'azure-appgw'], ['alb', 'elb', 'nlb', 'elastic load balancing', 'application load balancer']);
aws('cognito', 'Amazon Cognito', 'auth', 'User sign-up and sign-in.', ['auth0', 'clerk', 'azure-entra', 'firebase'], ['cognito', 'amazon cognito']);
aws('secrets', 'AWS Secrets Manager', 'secret', 'Stores and rotates secrets.', ['vault', 'azure-keyvault', 'gcp-secrets'], ['secrets manager', 'aws secrets manager', 'parameter store', 'ssm', 'aws kms', 'kms']);
aws('cloudwatch', 'Amazon CloudWatch', 'monitor', 'Logs, metrics and alarms.', ['datadog', 'grafana', 'azure-monitor'], ['cloudwatch', 'amazon cloudwatch']);
aws('ses', 'Amazon SES', 'mail', 'Email sending.', ['postmark', 'sendgrid', 'resend'], ['ses', 'amazon ses', 'simple email service']);
aws('redshift', 'Amazon Redshift', 'warehouse', 'Data warehouse.', ['snowflake', 'gcp-bigquery', 'clickhouse'], ['redshift', 'amazon redshift']);
aws('athena', 'Amazon Athena', 'analytics', 'SQL over files in S3.', ['gcp-bigquery', 'Trino', 'duckdb'], ['athena', 'amazon athena']);
aws('glue', 'AWS Glue', 'workflow', 'ETL and data catalog.', ['airflow', 'dbt', 'fivetran'], ['glue', 'aws glue']);
aws('bedrock', 'Amazon Bedrock', 'ai', 'Access to foundation models.', ['azure-openai', 'gcp-vertex', 'anthropic', 'openai'], ['bedrock', 'amazon bedrock']);
aws('sagemaker', 'Amazon SageMaker', 'ai', 'Build, train and host ML models.', ['gcp-vertex', 'azure-ml', 'databricks'], ['sagemaker', 'amazon sagemaker']);
aws('amplify', 'AWS Amplify', 'browser', 'Hosting and back end for web and mobile apps.', ['vercel', 'netlify', 'firebase'], ['amplify', 'aws amplify']);
aws('cdk', 'AWS CDK / CloudFormation', 'workflow', 'Infrastructure as code for AWS.', ['terraform', 'pulumi'], ['cdk', 'aws cdk', 'cloudformation', 'sam']);
// Azure
const az = (id, name, g, desc, alts, aka) => t(`azure-${id}`, name, 'azure', desc, alts, { g, p: 'azure', aka });
az('vm', 'Azure Virtual Machines', 'server', 'Virtual machines.', ['aws-ec2', 'gcp-compute'], ['azure vm', 'azure virtual machines']);
az('appservice', 'Azure App Service', 'server', 'Managed web apps.', ['aws-beanstalk', 'gcp-run', 'heroku'], ['app service', 'azure app service', 'azure web apps']);
az('functions', 'Azure Functions', 'fn', 'Serverless functions.', ['aws-lambda', 'gcp-functions'], ['azure functions']);
az('containerapps', 'Azure Container Apps', 'container', 'Serverless containers.', ['gcp-run', 'aws-fargate'], ['container apps', 'azure container apps', 'aci', 'azure container instances']);
az('aks', 'Azure Kubernetes Service', 'cluster', 'Managed Kubernetes.', ['aws-eks', 'gcp-gke'], ['aks', 'azure kubernetes service']);
az('blob', 'Azure Blob Storage', 'bucket', 'Object storage.', ['aws-s3', 'gcp-storage'], ['blob storage', 'azure blob', 'azure blob storage', 'azure storage']);
az('sql', 'Azure SQL Database', 'database', 'Managed SQL Server.', ['aws-rds', 'gcp-sql'], ['azure sql', 'azure sql database']);
az('postgres', 'Azure Database for PostgreSQL', 'database', 'Managed PostgreSQL.', ['aws-rds', 'gcp-sql', 'neon'], ['azure postgres', 'azure database for postgresql']);
az('cosmos', 'Azure Cosmos DB', 'database', 'Globally distributed multi-model database.', ['aws-dynamodb', 'gcp-firestore', 'mongodb'], ['cosmos', 'cosmos db', 'cosmosdb', 'azure cosmos db']);
az('redis', 'Azure Cache for Redis', 'cache', 'Managed Redis.', ['aws-elasticache', 'gcp-memorystore'], ['azure cache for redis', 'azure redis']);
az('servicebus', 'Azure Service Bus', 'queue', 'Message queues and topics.', ['aws-sqs', 'rabbitmq', 'gcp-pubsub'], ['service bus', 'azure service bus']);
az('eventhubs', 'Azure Event Hubs', 'stream', 'Event streaming (Kafka-compatible).', ['kafka', 'aws-kinesis'], ['event hubs', 'azure event hubs']);
az('eventgrid', 'Azure Event Grid', 'stream', 'Event routing.', ['aws-eventbridge', 'gcp-eventarc'], ['event grid', 'azure event grid']);
az('logicapps', 'Azure Logic Apps', 'workflow', 'Low-code workflows.', ['aws-stepfunctions', 'n8n', 'zapier'], ['logic apps', 'azure logic apps', 'durable functions']);
az('apim', 'Azure API Management', 'gateway', 'API gateway and portal.', ['aws-apigateway', 'kong'], ['api management', 'azure api management', 'apim']);
az('frontdoor', 'Azure Front Door', 'cdn', 'Global entry point and CDN.', ['cloudflare', 'aws-cloudfront'], ['front door', 'azure front door', 'azure cdn']);
az('appgw', 'Azure Application Gateway', 'lb', 'Load balancer with WAF.', ['aws-alb', 'nginx'], ['application gateway', 'azure application gateway', 'azure load balancer']);
az('entra', 'Microsoft Entra ID', 'auth', 'Identity (formerly Azure AD).', ['okta', 'auth0', 'aws-cognito'], ['entra', 'entra id', 'azure ad', 'azure active directory', 'azure ad b2c']);
az('keyvault', 'Azure Key Vault', 'secret', 'Secrets, keys and certificates.', ['vault', 'aws-secrets'], ['key vault', 'azure key vault']);
az('monitor', 'Azure Monitor', 'monitor', 'Metrics, logs and Application Insights.', ['datadog', 'aws-cloudwatch'], ['azure monitor', 'application insights', 'app insights', 'log analytics']);
az('openai', 'Azure OpenAI', 'ai', 'OpenAI models hosted by Azure.', ['openai', 'aws-bedrock', 'gcp-vertex'], ['azure openai', 'azure ai foundry']);
az('ml', 'Azure Machine Learning', 'ai', 'Build, train and host models.', ['aws-sagemaker', 'gcp-vertex'], ['azure ml', 'azure machine learning']);
az('synapse', 'Microsoft Fabric / Synapse', 'warehouse', 'Analytics and data warehouse.', ['snowflake', 'gcp-bigquery', 'databricks'], ['synapse', 'fabric', 'microsoft fabric']);
az('staticweb', 'Azure Static Web Apps', 'browser', 'Static sites with APIs.', ['vercel', 'netlify'], ['static web apps', 'azure static web apps']);
az('devops', 'Azure DevOps', 'git', 'Repos, boards and pipelines.', ['github', 'gitlab'], ['azure devops', 'azure pipelines']);
// Google Cloud
const gc = (id, name, g, desc, alts, aka, si) => t(`gcp-${id}`, name, 'gcp', desc, alts, { g, p: 'gcp', aka, ...(si ? { si } : {}) });
gc('compute', 'Compute Engine', 'server', 'Virtual machines.', ['aws-ec2', 'azure-vm'], ['compute engine', 'gce']);
gc('run', 'Cloud Run', 'container', 'Serverless containers.', ['aws-fargate', 'azure-containerapps', 'flyio'], ['cloud run', 'google cloud run']);
gc('functions', 'Cloud Functions', 'fn', 'Serverless functions.', ['aws-lambda', 'azure-functions'], ['cloud functions', 'google cloud functions']);
gc('gke', 'Google Kubernetes Engine', 'cluster', 'Managed Kubernetes.', ['aws-eks', 'azure-aks'], ['gke', 'google kubernetes engine']);
gc('appengine', 'App Engine', 'server', 'Managed app platform.', ['heroku', 'azure-appservice'], ['app engine', 'google app engine']);
gc('storage', 'Cloud Storage', 'bucket', 'Object storage.', ['aws-s3', 'azure-blob', 'r2'], ['cloud storage', 'gcs', 'google cloud storage'], 'googlecloudstorage');
gc('sql', 'Cloud SQL', 'database', 'Managed PostgreSQL, MySQL, SQL Server.', ['aws-rds', 'azure-sql'], ['cloud sql', 'google cloud sql']);
gc('alloydb', 'AlloyDB', 'database', 'PostgreSQL-compatible, high performance.', ['aws-aurora', 'cockroachdb'], ['alloydb']);
gc('spanner', 'Cloud Spanner', 'database', 'Globally distributed SQL.', ['cockroachdb', 'aws-aurora'], ['spanner', 'cloud spanner'], 'googlecloudspanner');
gc('firestore', 'Firestore', 'database', 'Serverless document database.', ['aws-dynamodb', 'azure-cosmos', 'mongodb'], ['firestore', 'datastore']);
gc('bigtable', 'Bigtable', 'database', 'Wide-column database for huge scale.', ['cassandra', 'aws-dynamodb'], ['bigtable']);
gc('memorystore', 'Memorystore', 'cache', 'Managed Redis, Valkey, Memcached.', ['aws-elasticache', 'azure-redis'], ['memorystore']);
gc('pubsub', 'Pub/Sub', 'queue', 'Messaging and event streams.', ['aws-sqs', 'kafka', 'azure-servicebus'], ['pubsub', 'pub/sub', 'google pub/sub', 'cloud pub/sub'], 'googlepubsub');
gc('tasks', 'Cloud Tasks', 'queue', 'Managed task queues.', ['aws-sqs', 'celery'], ['cloud tasks']);
gc('scheduler', 'Cloud Scheduler', 'clock', 'Managed cron.', ['aws-eventbridge'], ['cloud scheduler']);
gc('workflows', 'Workflows', 'workflow', 'Serverless workflows.', ['aws-stepfunctions', 'temporal'], ['google workflows', 'cloud workflows']);
gc('eventarc', 'Eventarc', 'stream', 'Event routing.', ['aws-eventbridge', 'azure-eventgrid'], ['eventarc']);
gc('apigateway', 'API Gateway / Apigee', 'gateway', 'API front door.', ['aws-apigateway', 'kong'], ['apigee', 'google api gateway']);
gc('cdn', 'Cloud CDN', 'cdn', 'Google\'s CDN in front of its load balancers.', ['cloudflare', 'aws-cloudfront'], ['cloud cdn']);
gc('lb', 'Cloud Load Balancing', 'lb', 'Global load balancing.', ['aws-alb', 'azure-appgw'], ['cloud load balancing', 'google load balancer']);
gc('dns', 'Cloud DNS', 'dns', 'Managed DNS zones on Google\'s network.', ['aws-route53', 'cloudflare'], ['cloud dns']);
gc('secrets', 'Secret Manager', 'secret', 'Stores secrets.', ['aws-secrets', 'vault'], ['secret manager', 'google secret manager']);
gc('identity', 'Identity Platform', 'auth', 'Sign-in for apps (Firebase Auth).', ['auth0', 'aws-cognito'], ['identity platform', 'firebase auth', 'firebase authentication']);
gc('logging', 'Cloud Logging & Monitoring', 'monitor', 'Logs, metrics and traces.', ['datadog', 'aws-cloudwatch'], ['cloud logging', 'cloud monitoring', 'stackdriver']);
gc('bigquery', 'BigQuery', 'warehouse', 'Serverless data warehouse.', ['snowflake', 'aws-redshift', 'clickhouse'], ['bigquery', 'big query'], 'googlebigquery');
gc('dataflow', 'Dataflow', 'stream', 'Batch and stream processing (Beam).', ['flink', 'spark'], ['dataflow', 'apache beam']);
gc('vertex', 'Vertex AI', 'ai', 'Models (Gemini and others), training and hosting.', ['aws-bedrock', 'azure-openai', 'aws-sagemaker'], ['vertex', 'vertex ai']);
gc('firebasehosting', 'Firebase Hosting', 'browser', 'Static and dynamic web hosting.', ['vercel', 'netlify'], ['firebase hosting']);

// ---- hosting & platforms
t('vercel', 'Vercel', 'host', 'Hosting for front ends and serverless functions.', ['netlify', 'cloudflare-pages', 'aws-amplify'], { si: 'vercel', aka: ['vercel'] });
t('netlify', 'Netlify', 'host', 'Hosting for sites and functions.', ['vercel', 'cloudflare-pages'], { si: 'netlify', aka: ['netlify'] });
t('cloudflare-pages', 'Cloudflare Pages', 'host', 'Sites on Cloudflare\'s edge.', ['vercel', 'netlify'], { si: 'cloudflarepages', aka: ['cloudflare pages'] });
t('cloudflare-workers', 'Cloudflare Workers', 'host', 'Functions at the edge.', ['aws-lambda', 'deno-deploy', 'vercel'], { si: 'cloudflareworkers', aka: ['workers', 'cloudflare workers', 'durable objects'] });
t('deno-deploy', 'Deno Deploy', 'host', 'Serverless JavaScript at the edge.', ['cloudflare-workers', 'vercel'], { si: 'deno', aka: ['deno deploy'] });
t('heroku', 'Heroku', 'host', 'Platform as a service: push code, it runs.', ['render', 'railway', 'flyio'], { mono: ['H', '#430098', '#fff'], aka: ['heroku'] });
t('render', 'Render', 'host', 'Apps, databases and jobs as a service.', ['heroku', 'railway', 'flyio'], { si: 'render', aka: ['render', 'render.com'] });
t('railway', 'Railway', 'host', 'Deploy apps and databases quickly.', ['render', 'heroku'], { si: 'railway', aka: ['railway'] });
t('flyio', 'Fly.io', 'host', 'Run apps close to users, worldwide.', ['render', 'gcp-run'], { mono: ['fly', '#7B3BE2', '#fff'], aka: ['fly', 'fly.io', 'flyio'] });
t('coolify', 'Coolify', 'host', 'Self-hosted platform (like Heroku) on your servers.', ['dokku', 'CapRover'], { si: 'coolify', aka: ['coolify'] });
t('dokku', 'Dokku', 'host', 'Self-hosted mini-Heroku.', ['coolify'], { mono: ['Dk', '#0F6BBE', '#fff'], aka: ['dokku'] });
t('github-pages', 'GitHub Pages', 'host', 'Static sites from a repository.', ['netlify', 'cloudflare-pages'], { si: 'github', aka: ['github pages'] });

// ---- containers & orchestration
t('docker', 'Docker', 'ops', 'Builds and runs containers.', ['podman'], { si: 'docker', aka: ['docker', 'docker compose', 'compose'] });
t('podman', 'Podman', 'ops', 'Daemonless containers.', ['docker'], { si: 'podman', aka: ['podman'] });
t('kubernetes', 'Kubernetes', 'ops', 'Container orchestration.', ['nomad', 'aws-ecs', 'docker'], { si: 'kubernetes', aka: ['kubernetes', 'k8s', 'k3s'] });
t('helm', 'Helm', 'ops', 'Package manager for Kubernetes.', ['Kustomize'], { si: 'helm', aka: ['helm'] });
t('argocd', 'Argo CD', 'ops', 'GitOps deployments to Kubernetes.', ['Flux'], { si: 'argo', aka: ['argo', 'argo cd', 'argocd'] });
t('nomad', 'Nomad', 'ops', 'Simple scheduler for containers and apps.', ['kubernetes'], { si: 'nomad', aka: ['nomad'] });
t('openshift', 'OpenShift', 'ops', 'Red Hat\'s Kubernetes platform.', ['kubernetes', 'rancher'], { mono: ['OS', '#EE0000', '#fff'], aka: ['openshift'] });
t('rancher', 'Rancher', 'ops', 'Manages Kubernetes clusters.', ['openshift'], { si: 'rancher', aka: ['rancher'] });

// ---- network, edge & gateways
t('cloudflare', 'Cloudflare', 'net', 'CDN, DNS, WAF and edge network.', ['fastly', 'aws-cloudfront', 'akamai'], { si: 'cloudflare', aka: ['cloudflare'] });
t('fastly', 'Fastly', 'net', 'Edge cloud and CDN.', ['cloudflare', 'akamai'], { si: 'fastly', aka: ['fastly'] });
t('akamai', 'Akamai', 'net', 'CDN and security.', ['cloudflare', 'fastly'], { si: 'akamai', aka: ['akamai'] });
t('nginx', 'NGINX', 'net', 'Web server, reverse proxy and load balancer.', ['caddy', 'traefik', 'haproxy', 'envoy'], { si: 'nginx', aka: ['nginx'] });
t('caddy', 'Caddy', 'net', 'Web server with automatic HTTPS.', ['nginx', 'traefik'], { si: 'caddy', aka: ['caddy'] });
t('traefik', 'Traefik', 'net', 'Reverse proxy that configures itself from containers.', ['nginx', 'caddy'], { si: 'traefikproxy', aka: ['traefik'] });
t('haproxy', 'HAProxy', 'net', 'High-performance load balancer.', ['nginx', 'envoy'], { si: 'haproxy', aka: ['haproxy'] });
t('envoy', 'Envoy', 'net', 'Service proxy (often in meshes).', ['nginx', 'haproxy'], { si: 'envoyproxy', aka: ['envoy'] });
t('istio', 'Istio', 'net', 'Service mesh.', ['linkerd'], { si: 'istio', aka: ['istio', 'service mesh'] });
t('linkerd', 'Linkerd', 'net', 'Light service mesh.', ['istio'], { si: 'linkerd', aka: ['linkerd'] });
t('kong', 'Kong', 'net', 'Open-source API gateway with plugins (auth, limits).', ['aws-apigateway', 'tyk', 'traefik'], { si: 'kong', aka: ['kong'] });
t('tyk', 'Tyk', 'net', 'Open-source API gateway.', ['kong'], { mono: ['Tyk', '#20EDBA', '#03031C'], aka: ['tyk'] });
t('apache', 'Apache HTTP Server', 'net', 'Long-standing web server with modules.', ['nginx', 'caddy'], { si: 'apache', aka: ['apache', 'httpd', 'apache httpd'] });
t('tailscale', 'Tailscale', 'net', 'Private network between machines (WireGuard).', ['wireguard', 'ZeroTier'], { si: 'tailscale', aka: ['tailscale'] });
t('wireguard', 'WireGuard', 'net', 'Fast, simple VPN built into Linux.', ['tailscale', 'OpenVPN'], { si: 'wireguard', aka: ['wireguard', 'vpn'] });
t('letsencrypt', 'Let\'s Encrypt', 'net', 'Free TLS certificates.', [], { si: 'letsencrypt', aka: ['letsencrypt', 'let\'s encrypt', 'tls', 'https'] });

// ---- identity & secrets
t('auth0', 'Auth0', 'auth', 'Hosted identity and login.', ['clerk', 'okta', 'aws-cognito', 'keycloak'], { si: 'auth0', aka: ['auth0'] });
t('clerk', 'Clerk', 'auth', 'User management and sign-in UI.', ['auth0', 'supabase', 'workos'], { si: 'clerk', aka: ['clerk'] });
t('okta', 'Okta', 'auth', 'Enterprise identity and SSO.', ['azure-entra', 'auth0'], { si: 'okta', aka: ['okta'] });
t('keycloak', 'Keycloak', 'auth', 'Open-source identity server (OIDC, SAML).', ['authentik', 'auth0', 'zitadel'], { si: 'keycloak', aka: ['keycloak'] });
t('authentik', 'authentik', 'auth', 'Open-source identity provider.', ['keycloak'], { si: 'authentik', aka: ['authentik'] });
t('zitadel', 'ZITADEL', 'auth', 'Open-source identity platform.', ['keycloak', 'auth0'], { mono: ['Z', '#FF5555', '#fff'], aka: ['zitadel'] });
t('workos', 'WorkOS', 'auth', 'Enterprise SSO and directory sync for apps.', ['auth0', 'clerk'], { mono: ['WO', '#6363F1', '#fff'], aka: ['workos'] });
t('authjs', 'Auth.js', 'auth', 'Sign-in library for JavaScript apps (NextAuth).', ['clerk', 'Lucia', 'betterauth'], { mono: ['Auth', '#7A3EF0', '#fff'], aka: ['auth.js', 'nextauth', 'next-auth'] });
t('betterauth', 'Better Auth', 'auth', 'TypeScript authentication library.', ['authjs', 'clerk'], { mono: ['BA', '#000000', '#fff'], aka: ['better auth', 'better-auth'] });
t('oidc', 'OpenID Connect', 'auth', 'Standard sign-in on top of OAuth 2.', ['SAML'], { si: 'openid', aka: ['oidc', 'openid', 'openid connect', 'oauth', 'oauth2', 'oauth 2'] });
t('jwt', 'JWT', 'auth', 'Signed tokens carrying who the user is.', ['Server sessions'], { si: 'jsonwebtokens', aka: ['jwt', 'json web token', 'json web tokens'] });
t('vault', 'HashiCorp Vault', 'auth', 'Secrets, keys and dynamic credentials.', ['aws-secrets', 'azure-keyvault', 'infisical'], { si: 'vault', aka: ['vault', 'hashicorp vault', 'openbao'] });
t('infisical', 'Infisical', 'auth', 'Open-source secrets manager.', ['vault', 'doppler'], { mono: ['If', '#E0ED34', '#000'], aka: ['infisical'] });
t('doppler', 'Doppler', 'auth', 'Secrets for every environment.', ['infisical', 'vault'], { mono: ['Dp', '#3391FF', '#fff'], aka: ['doppler'] });

// ---- payments
t('stripe', 'Stripe', 'pay', 'Online payments, subscriptions and invoices.', ['adyen', 'paddle', 'mollie', 'braintree'], { si: 'stripe', aka: ['stripe'] });
t('paddle', 'Paddle', 'pay', 'Payments with sales tax handled (merchant of record).', ['lemonsqueezy', 'stripe'], { si: 'paddle', aka: ['paddle'] });
t('lemonsqueezy', 'Lemon Squeezy', 'pay', 'Merchant of record for software.', ['paddle', 'stripe'], { si: 'lemonsqueezy', aka: ['lemon squeezy', 'lemonsqueezy'] });
t('adyen', 'Adyen', 'pay', 'Enterprise payments platform.', ['stripe', 'Checkout.com'], { si: 'adyen', aka: ['adyen'] });
t('paypal', 'PayPal', 'pay', 'Wallet and card payments.', ['stripe'], { si: 'paypal', aka: ['paypal'] });
t('braintree', 'Braintree', 'pay', 'PayPal\'s payment gateway.', ['stripe', 'adyen'], { si: 'braintree', aka: ['braintree'] });
t('mollie', 'Mollie', 'pay', 'European payments.', ['stripe', 'adyen'], { mono: ['mo', '#000000', '#fff'], aka: ['mollie'] });
t('square', 'Square', 'pay', 'Payments and point of sale.', ['stripe'], { si: 'square', aka: ['square'] });
t('gocardless', 'GoCardless', 'pay', 'Bank debits (SEPA, ACH).', ['stripe'], { mono: ['GC', '#1C1B2C', '#fff'], aka: ['gocardless'] });
t('plaid', 'Plaid', 'pay', 'Connects to bank accounts.', ['Tink', 'TrueLayer'], { mono: ['Pl', '#111111', '#fff'], aka: ['plaid'] });
t('klarna', 'Klarna', 'pay', 'Buy now, pay later.', ['paypal'], { si: 'klarna', aka: ['klarna'] });

// ---- email, SMS & notifications
t('postmark', 'Postmark', 'notify', 'Transactional email, fast delivery.', ['resend', 'sendgrid', 'aws-ses', 'mailgun'], { mono: ['Pm', '#FFDE00', '#000'], aka: ['postmark'] });
t('resend', 'Resend', 'notify', 'Email API for developers.', ['postmark', 'sendgrid', 'aws-ses'], { si: 'resend', aka: ['resend'] });
t('sendgrid', 'SendGrid', 'notify', 'Email sending (Twilio).', ['postmark', 'mailgun', 'aws-ses'], { mono: ['SG', '#1A82E2', '#fff'], aka: ['sendgrid'] });
t('mailgun', 'Mailgun', 'notify', 'Email sending and receiving by API.', ['sendgrid', 'postmark'], { si: 'mailgun', aka: ['mailgun'] });
t('brevo', 'Brevo', 'notify', 'Email and SMS marketing and transactional.', ['mailchimp', 'sendgrid'], { si: 'brevo', aka: ['brevo', 'sendinblue'] });
t('mailchimp', 'Mailchimp', 'notify', 'Email marketing.', ['brevo', 'Customer.io'], { si: 'mailchimp', aka: ['mailchimp'] });
t('twilio', 'Twilio', 'notify', 'SMS, voice and WhatsApp APIs.', ['vonage', 'MessageBird (Bird)', 'aws-sns'], { mono: ['Tw', '#F22F46', '#fff'], aka: ['twilio'] });
t('vonage', 'Vonage', 'notify', 'SMS and voice APIs.', ['twilio'], { si: 'vonage', aka: ['vonage', 'nexmo'] });
t('onesignal', 'OneSignal', 'notify', 'Push, in-app, email and SMS.', ['fcm', 'novu'], { mono: ['1S', '#E54B4D', '#fff'], aka: ['onesignal'] });
t('fcm', 'Firebase Cloud Messaging', 'notify', 'Push notifications to Android, iOS, web.', ['onesignal', 'apns'], { si: 'firebase', aka: ['fcm', 'firebase cloud messaging'] });
t('apns', 'Apple Push (APNs)', 'notify', 'Push to Apple devices.', ['fcm'], { si: 'apple', aka: ['apns', 'apple push'] });
t('novu', 'Novu', 'notify', 'Open-source notification infrastructure.', ['Knock', 'onesignal'], { mono: ['Nv', '#DD2476', '#fff'], aka: ['novu'] });
t('slack', 'Slack', 'notify', 'Team chat; messages and bots by API.', ['teams', 'discord'], { mono: ['Sl', '#4A154B', '#fff'], aka: ['slack'] });
t('teams', 'Microsoft Teams', 'notify', 'Team chat and meetings.', ['slack'], { mono: ['T', '#5059C9', '#fff'], aka: ['teams', 'microsoft teams'] });
t('discord', 'Discord', 'notify', 'Community chat; bots by API.', ['slack'], { si: 'discord', aka: ['discord'] });
t('whatsapp', 'WhatsApp Business', 'notify', 'Messages to customers on WhatsApp.', ['twilio', 'telegram'], { si: 'whatsapp', aka: ['whatsapp'] });
t('telegram', 'Telegram', 'notify', 'Messaging; bots by API.', ['whatsapp', 'discord'], { si: 'telegram', aka: ['telegram'] });

// ---- AI & ML
t('openai', 'OpenAI', 'ai', 'GPT models by API.', ['anthropic', 'google-gemini', 'mistral', 'azure-openai'], { mono: ['AI', '#10A37F', '#fff'], aka: ['openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-4o', 'gpt-5'] });
t('anthropic', 'Anthropic Claude', 'ai', 'Claude models by API.', ['openai', 'google-gemini', 'aws-bedrock'], { si: 'anthropic', aka: ['anthropic', 'claude'] });
t('google-gemini', 'Google Gemini', 'ai', 'Gemini models by API.', ['openai', 'anthropic', 'gcp-vertex'], { si: 'googlegemini', aka: ['gemini', 'google gemini'] });
t('mistral', 'Mistral AI', 'ai', 'European open and hosted models.', ['openai', 'anthropic'], { si: 'mistralai', aka: ['mistral', 'mistral ai'] });
t('ollama', 'Ollama', 'ai', 'Runs open models locally.', ['vllm', 'llama.cpp'], { si: 'ollama', aka: ['ollama'] });
t('vllm', 'vLLM', 'ai', 'Fast model serving on GPUs.', ['ollama', 'TGI'], { mono: ['vLLM', '#30A2FF', '#fff'], aka: ['vllm'] });
t('huggingface', 'Hugging Face', 'ai', 'Models, datasets and inference.', ['replicate', 'gcp-vertex'], { si: 'huggingface', aka: ['hugging face', 'huggingface', 'hf'] });
t('replicate', 'Replicate', 'ai', 'Runs open models by API.', ['huggingface', 'modal'], { si: 'replicate', aka: ['replicate'] });
t('modal', 'Modal', 'ai', 'Serverless GPUs for Python.', ['replicate', 'RunPod'], { si: 'modal', aka: ['modal'] });
t('langchain', 'LangChain', 'ai', 'Framework for LLM apps and agents.', ['llamaindex', 'vercel-ai'], { si: 'langchain', aka: ['langchain', 'langgraph'] });
t('llamaindex', 'LlamaIndex', 'ai', 'Data framework for LLM apps (RAG).', ['langchain'], { mono: ['LI', '#000000', '#fff'], aka: ['llamaindex', 'llama index'] });
t('vercel-ai', 'Vercel AI SDK', 'ai', 'TypeScript toolkit for AI features.', ['langchain'], { si: 'vercel', aka: ['ai sdk', 'vercel ai sdk'] });
t('pytorch', 'PyTorch', 'ai', 'Deep learning framework.', ['tensorflow', 'JAX'], { si: 'pytorch', aka: ['pytorch', 'torch'] });
t('tensorflow', 'TensorFlow', 'ai', 'Machine learning framework.', ['pytorch'], { si: 'tensorflow', aka: ['tensorflow', 'keras'] });
t('sklearn', 'scikit-learn', 'ai', 'Classic machine learning in Python.', ['XGBoost'], { si: 'scikitlearn', aka: ['scikit-learn', 'sklearn'] });
t('mlflow', 'MLflow', 'ai', 'Tracks experiments and models.', ['Weights & Biases'], { si: 'mlflow', aka: ['mlflow'] });

// ---- observability
t('datadog', 'Datadog', 'obs', 'Metrics, logs, traces and alerts as a service.', ['grafana', 'newrelic', 'dynatrace'], { si: 'datadog', aka: ['datadog'] });
t('grafana', 'Grafana', 'obs', 'Dashboards over metrics, logs and traces.', ['datadog', 'elk'], { si: 'grafana', aka: ['grafana', 'grafana cloud'] });
t('prometheus', 'Prometheus', 'obs', 'Metrics collection and alerting.', ['datadog', 'VictoriaMetrics'], { si: 'prometheus', aka: ['prometheus'] });
t('loki', 'Grafana Loki', 'obs', 'Log aggregation.', ['elk', 'datadog'], { si: 'grafana', aka: ['loki'] });
t('opentelemetry', 'OpenTelemetry', 'obs', 'Standard for traces, metrics and logs.', [], { si: 'opentelemetry', aka: ['opentelemetry', 'otel'] });
t('jaeger', 'Jaeger', 'obs', 'Distributed tracing.', ['Grafana Tempo', 'Zipkin'], { si: 'jaeger', aka: ['jaeger'] });
t('sentry', 'Sentry', 'obs', 'Error and performance monitoring.', ['Bugsnag', 'Rollbar', 'datadog'], { si: 'sentry', aka: ['sentry'] });
t('newrelic', 'New Relic', 'obs', 'Observability platform.', ['datadog', 'dynatrace'], { si: 'newrelic', aka: ['new relic', 'newrelic'] });
t('dynatrace', 'Dynatrace', 'obs', 'Enterprise observability.', ['datadog', 'newrelic'], { si: 'dynatrace', aka: ['dynatrace'] });
t('elk', 'Elastic Stack (ELK)', 'obs', 'Logs with Elasticsearch, Logstash, Kibana.', ['loki', 'datadog'], { si: 'elastic', aka: ['elk', 'elastic stack', 'kibana', 'logstash'] });
t('splunk', 'Splunk', 'obs', 'Log search and security analytics.', ['elk', 'datadog'], { si: 'splunk', aka: ['splunk'] });
t('pagerduty', 'PagerDuty', 'obs', 'On-call and incident alerts.', ['Opsgenie'], { si: 'pagerduty', aka: ['pagerduty'] });
t('betterstack', 'Better Stack', 'obs', 'Uptime, logs and status pages.', ['uptimekuma', 'datadog'], { si: 'betterstack', aka: ['better stack', 'betterstack', 'better uptime'] });
t('uptimekuma', 'Uptime Kuma', 'obs', 'Self-hosted uptime monitoring.', ['betterstack'], { si: 'uptimekuma', aka: ['uptime kuma'] });

// ---- CI/CD & infrastructure
t('github', 'GitHub', 'ci', 'Code hosting, pull requests, issues.', ['gitlab', 'bitbucket'], { si: 'github', aka: ['github'] });
t('github-actions', 'GitHub Actions', 'ci', 'CI/CD in GitHub.', ['gitlab', 'circleci', 'jenkins'], { si: 'githubactions', aka: ['github actions', 'gha'] });
t('gitlab', 'GitLab', 'ci', 'Code hosting with CI/CD built in.', ['github'], { si: 'gitlab', aka: ['gitlab', 'gitlab ci', 'gitlab-ci'] });
t('bitbucket', 'Bitbucket', 'ci', 'Code hosting by Atlassian.', ['github', 'gitlab'], { si: 'bitbucket', aka: ['bitbucket'] });
t('jenkins', 'Jenkins', 'ci', 'Self-hosted automation server.', ['github-actions', 'gitlab'], { si: 'jenkins', aka: ['jenkins'] });
t('circleci', 'CircleCI', 'ci', 'Hosted CI/CD.', ['github-actions'], { si: 'circleci', aka: ['circleci'] });
t('terraform', 'Terraform', 'ci', 'Infrastructure as code.', ['opentofu', 'pulumi', 'aws-cdk'], { si: 'terraform', aka: ['terraform'] });
t('opentofu', 'OpenTofu', 'ci', 'Open-source fork of Terraform.', ['terraform'], { si: 'opentofu', aka: ['opentofu', 'tofu'] });
t('pulumi', 'Pulumi', 'ci', 'Infrastructure as code in real languages.', ['terraform', 'aws-cdk'], { si: 'pulumi', aka: ['pulumi'] });
t('ansible', 'Ansible', 'ci', 'Configures servers from playbooks.', ['Chef', 'Puppet'], { si: 'ansible', aka: ['ansible'] });

// ---- data & analytics
t('snowflake', 'Snowflake', 'data', 'Cloud data warehouse.', ['gcp-bigquery', 'databricks', 'aws-redshift'], { si: 'snowflake', aka: ['snowflake'] });
t('databricks', 'Databricks', 'data', 'Lakehouse platform (Spark).', ['snowflake', 'gcp-bigquery'], { si: 'databricks', aka: ['databricks'] });
t('clickhouse', 'ClickHouse', 'data', 'Fast column database for analytics.', ['Apache Druid', 'gcp-bigquery', 'duckdb'], { si: 'clickhouse', aka: ['clickhouse'] });
t('duckdb', 'DuckDB', 'data', 'In-process analytics database.', ['clickhouse', 'sqlite'], { si: 'duckdb', aka: ['duckdb'] });
t('spark', 'Apache Spark', 'data', 'Large-scale data processing.', ['flink', 'databricks', 'gcp-dataflow'], { si: 'apachespark', aka: ['spark', 'apache spark', 'pyspark'] });
t('flink', 'Apache Flink', 'data', 'Stream processing.', ['spark', 'gcp-dataflow'], { si: 'apacheflink', aka: ['flink', 'apache flink'] });
t('airflow', 'Apache Airflow', 'data', 'Schedules data pipelines.', ['dagster', 'prefect', 'aws-glue'], { si: 'apacheairflow', aka: ['airflow', 'apache airflow'] });
t('dagster', 'Dagster', 'data', 'Data orchestrator around assets.', ['airflow', 'prefect'], { si: 'dagster', aka: ['dagster'] });
t('prefect', 'Prefect', 'data', 'Python workflow orchestration.', ['airflow', 'dagster'], { si: 'prefect', aka: ['prefect'] });
t('dbt', 'dbt', 'data', 'SQL transformations in the warehouse.', ['SQLMesh'], { mono: ['dbt', '#FF694B', '#fff'], aka: ['dbt'] });
t('fivetran', 'Fivetran', 'data', 'Managed data connectors (ELT).', ['airbyte'], { si: 'fivetran', aka: ['fivetran'] });
t('airbyte', 'Airbyte', 'data', 'Open-source data connectors.', ['fivetran'], { si: 'airbyte', aka: ['airbyte'] });
t('metabase', 'Metabase', 'data', 'Open-source dashboards and questions.', ['superset', 'looker', 'powerbi'], { si: 'metabase', aka: ['metabase'] });
t('superset', 'Apache Superset', 'data', 'Open-source BI.', ['metabase'], { si: 'apachesuperset', aka: ['superset', 'apache superset'] });
t('looker', 'Looker', 'data', 'Google\'s BI platform.', ['powerbi', 'tableau', 'metabase'], { si: 'looker', aka: ['looker', 'looker studio'] });
t('powerbi', 'Power BI', 'data', 'Microsoft\'s BI.', ['looker', 'tableau'], { mono: ['BI', '#F2C811', '#000'], aka: ['power bi', 'powerbi'] });
t('tableau', 'Tableau', 'data', 'Visual analytics.', ['powerbi', 'looker'], { mono: ['Tb', '#E97627', '#fff'], aka: ['tableau'] });
t('posthog', 'PostHog', 'data', 'Product analytics, replays, flags.', ['mixpanel', 'amplitude'], { si: 'posthog', aka: ['posthog'] });
t('mixpanel', 'Mixpanel', 'data', 'Product analytics.', ['amplitude', 'posthog'], { si: 'mixpanel', aka: ['mixpanel'] });
t('amplitude', 'Amplitude', 'data', 'Product analytics.', ['mixpanel', 'posthog'], { mono: ['A', '#1E61F0', '#fff'], aka: ['amplitude'] });
t('ga', 'Google Analytics', 'data', 'Web analytics.', ['plausible', 'posthog'], { si: 'googleanalytics', aka: ['google analytics', 'ga4'] });
t('plausible', 'Plausible', 'data', 'Privacy-friendly web analytics.', ['ga', 'Umami'], { si: 'plausibleanalytics', aka: ['plausible'] });
t('segment', 'Segment', 'data', 'Collects events and sends them to tools.', ['RudderStack'], { mono: ['Sg', '#52BD94', '#fff'], aka: ['segment'] });

// ---- jobs & workflows
t('temporal', 'Temporal', 'jobs', 'Durable workflows that survive failures.', ['aws-stepfunctions', 'inngest', 'Restate'], { si: 'temporal', aka: ['temporal'] });
t('inngest', 'Inngest', 'jobs', 'Event-driven background functions.', ['trigger', 'temporal'], { mono: ['In', '#000000', '#fff'], aka: ['inngest'] });
t('trigger', 'Trigger.dev', 'jobs', 'Background jobs for TypeScript.', ['inngest', 'bullmq'], { mono: ['Tr', '#A8FF53', '#000'], aka: ['trigger.dev', 'trigger'] });
t('n8n', 'n8n', 'jobs', 'Workflow automation (self-hostable).', ['zapier', 'make'], { si: 'n8n', aka: ['n8n'] });
t('zapier', 'Zapier', 'jobs', 'No-code automation between apps.', ['make', 'n8n'], { si: 'zapier', aka: ['zapier'] });
t('make', 'Make (Integromat)', 'jobs', 'Visual automation.', ['zapier', 'n8n'], { si: 'make', aka: ['make.com', 'integromat'] });

// ---- CMS & back-office
t('strapi', 'Strapi', 'cms', 'Open-source headless CMS.', ['directus', 'payload', 'contentful'], { si: 'strapi', aka: ['strapi'] });
t('directus', 'Directus', 'cms', 'Data platform and CMS over any SQL database.', ['strapi', 'payload'], { si: 'directus', aka: ['directus'] });
t('payload', 'Payload', 'cms', 'TypeScript headless CMS.', ['strapi', 'sanity'], { si: 'payloadcms', aka: ['payload', 'payload cms'] });
t('contentful', 'Contentful', 'cms', 'Hosted headless CMS.', ['sanity', 'strapi'], { si: 'contentful', aka: ['contentful'] });
t('sanity', 'Sanity', 'cms', 'Structured content platform.', ['contentful', 'payload'], { si: 'sanity', aka: ['sanity'] });
t('wordpress', 'WordPress', 'cms', 'The most used CMS.', ['strapi', 'Ghost'], { si: 'wordpress', aka: ['wordpress', 'wp'] });
t('shopify', 'Shopify', 'cms', 'E-commerce platform.', ['Medusa', 'WooCommerce'], { si: 'shopify', aka: ['shopify'] });
t('retool', 'Retool', 'cms', 'Internal tools builder.', ['Appsmith', 'Budibase'], { si: 'retool', aka: ['retool'] });
t('airtable', 'Airtable', 'cms', 'Spreadsheet-database for teams.', ['Notion', 'NocoDB'], { si: 'airtable', aka: ['airtable'] });
t('salesforce', 'Salesforce', 'cms', 'CRM platform.', ['hubspot'], { mono: ['SF', '#00A1E0', '#fff'], aka: ['salesforce', 'sfdc'] });
t('hubspot', 'HubSpot', 'cms', 'CRM and marketing.', ['salesforce'], { si: 'hubspot', aka: ['hubspot'] });
t('mapbox', 'Mapbox', 'cms', 'Maps and location APIs.', ['google-maps', 'MapLibre'], { si: 'mapbox', aka: ['mapbox'] });
t('google-maps', 'Google Maps Platform', 'cms', 'Maps, places and routes APIs.', ['mapbox'], { si: 'googlemaps', aka: ['google maps'] });

export const TECH = E;
export const BY_ID = new Map(E.map(e => [e.id, e]));

// ---- matching a component's tech text ----
const norm = s => String(s).toLowerCase().replace(/[™®]/g, '').trim();
const ALIASES = [];
for (const e of E) for (const a of new Set([norm(e.name), ...(e.aka ?? []).map(norm)])) ALIASES.push([a, e]);
ALIASES.sort((a, b) => b[0].length - a[0].length); // longest first: "aws lambda" before "lambda", "react native" before "react"
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE = new Map(ALIASES.map(([a]) => [a, new RegExp(`(^|[^a-z0-9#+])${escRe(a)}(?=$|[^a-z0-9#+])`)]));

/** The catalog entries named in a tech text, in order, each once ("Node 22 · Fastify · PostgreSQL 16"). */
export function matchTech(text) {
  const out = [];
  const seen = new Set();
  for (const part of String(text ?? '').split(/\s*(?:[,·;|+]|\s\/\s|\band\b|\bon\b|\bwith\b)\s*/i)) {
    let rest = norm(part);
    let named = false;
    // within one part, several names may follow each other ("Next.js 15 React 19")
    for (let guard = 0; rest && guard < 4; guard++) {
      let hit = null;
      for (const [a, e] of ALIASES) { const m = RE.get(a).exec(rest); if (m && (!hit || m.index < hit.at)) hit = { e, at: m.index, len: m[0].length }; }
      if (!hit) break;
      // a generic word next to a named product says nothing more ("PostgreSQL database")
      const generic = hit.e.cat === 'generic';
      if (generic) { if (!named && !seen.has(hit.e.id)) { seen.add(hit.e.id); out.push(hit.e); } } else { named = true; if (!seen.has(hit.e.id)) { seen.add(hit.e.id); out.push(hit.e); } }
      rest = (rest.slice(0, hit.at) + ' ' + rest.slice(hit.at + hit.len)).trim();
    }
  }
  return out;
}

/** The generic block for a component kind, when its tech names nothing known. */
export const KIND_GENERIC = { client: 'g-user', frontend: 'g-browser', interface: 'g-api', service: 'g-server', queue: 'g-queue', store: 'g-database', external: 'g-external' };

const isDark = hex => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40; };
const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** An entry's icon as inline SVG (24×24 box). Brand marks in their colour (near-black ones follow the text colour). */
export function techIcon(e, { size = 20, title = true } = {}) {
  if (!e) return '';
  const tt = title ? `<title>${xmlEsc(e.name)}</title>` : '';
  const svg = (inner, cls) => `<svg class="ti ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${xmlEsc(e.name)}">${tt}${inner}</svg>`;
  const brand = e.si && BRAND[e.si];
  if (brand && !e.g) return svg(`<path fill="${isDark(`#${brand.hex}`) ? 'currentColor' : `#${brand.hex}`}" d="${brand.path}"/>`, 'ti-brand');
  if (e.mono) {
    const [txt, bg, fg] = e.mono;
    const fs = txt.length >= 4 ? 7 : txt.length === 3 ? 8.5 : txt.length === 2 ? 10.5 : 13;
    return svg(`<rect x="1" y="1" width="22" height="22" rx="5.5" fill="${bg}"/><text x="12" y="${12 + fs * 0.36}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-weight="700" font-size="${fs}" fill="${fg}">${xmlEsc(txt)}</text>`, 'ti-mono');
  }
  const glyph = `<g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${G[e.g] ?? G.server}</g>`;
  if (!e.p) return svg(glyph, 'ti-glyph');
  // a cloud service: the generic glyph with the provider's badge in the corner
  const pb = e.p === 'gcp' && BRAND.googlecloud
    ? `<g transform="translate(13.5 13.5) scale(.44)"><rect x="-1" y="-1" width="26" height="26" rx="6" fill="var(--ti-badge-bg, #fff)"/><path fill="#${BRAND.googlecloud.hex}" d="${BRAND.googlecloud.path}"/></g>`
    : (() => { const [txt, bg, fg] = PROVIDER[e.p]; return `<rect x="12.5" y="14.5" width="11" height="9" rx="2.5" fill="${bg}"/><text x="18" y="21.3" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="6" fill="${fg}">${txt}</text>`; })();
  return svg(`<g transform="scale(.8)">${glyph}</g>${pb}`, `ti-glyph ti-${e.p}`);
}

/** For the spec and the detail panel: what it is and what could replace it (names). */
export function techFacts(e) {
  return { name: e.name, category: CATEGORIES.find(([k]) => k === e.cat)?.[1] ?? e.cat, description: e.desc, alternatives: e.alts.map(a => BY_ID.get(a)?.name ?? a) };
}

/** Search the catalog (the picker): name, aliases, category. */
export function searchTech(q, { limit = 400 } = {}) {
  const s = norm(q);
  if (!s) return E.slice(0, limit);
  const hits = [];
  for (const e of E) {
    const name = norm(e.name);
    const score = (e.cat === 'generic' ? 0.5 : 0) + (name === s || (e.aka ?? []).includes(s) ? 0 : name.startsWith(s) ? 1 : (e.aka ?? []).some(a => a.startsWith(s)) ? 2 : name.includes(s) || (e.aka ?? []).some(a => a.includes(s)) ? 3 : norm(e.desc).includes(s) || norm(CATEGORIES.find(([k]) => k === e.cat)?.[1] ?? '').includes(s) ? 4 : -9);
    if (score >= 0) hits.push([score, e]);
  }
  return hits.sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, e]) => e);
}
