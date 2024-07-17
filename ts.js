//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const typesense = require("typesense");
const client = new typesense.Client({
  nodes: [
    {
      host: "192.168.30.36",
      port: 8108,
      protocol: "http",
    },
  ],
  'apiKey': 'xyz123',
  'connection_timeout_seconds': 8,
});

export default client;
