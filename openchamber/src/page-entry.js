// Order matters: the shim replaces fetch/EventSource before the app's first request.
import './page.js';
import '../../src/web/public/app.js';
