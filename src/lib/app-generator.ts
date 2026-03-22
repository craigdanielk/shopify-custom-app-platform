// Shopify Custom App scaffold generator engine
// Generates complete app configurations, webhook handlers, and metafield schemas

export interface AppConfig {
  name: string;
  scopes: string[];
  webhooks: WebhookConfig[];
  metafields: MetafieldConfig[];
  appProxy?: { subpath: string; prefix: string };
  embedded: boolean;
}

export interface WebhookConfig {
  topic: string;
  handler: string;
  format: "json" | "xml";
}

export interface MetafieldConfig {
  namespace: string;
  key: string;
  type: "single_line_text_field" | "multi_line_text_field" | "number_integer" | "number_decimal" | "json" | "boolean" | "date" | "url" | "color" | "rating";
  ownerType: "PRODUCT" | "VARIANT" | "CUSTOMER" | "ORDER" | "SHOP";
  name: string;
  description: string;
  validations?: Array<{ name: string; value: string }>;
}

export const AVAILABLE_SCOPES = [
  "read_products", "write_products",
  "read_orders", "write_orders",
  "read_customers", "write_customers",
  "read_inventory", "write_inventory",
  "read_fulfillments", "write_fulfillments",
  "read_shipping", "write_shipping",
  "read_themes", "write_themes",
  "read_content", "write_content",
  "read_price_rules", "write_price_rules",
  "read_discounts", "write_discounts",
  "read_reports", "write_reports",
  "read_analytics",
];

export const WEBHOOK_TOPICS = [
  "orders/create", "orders/updated", "orders/paid", "orders/fulfilled", "orders/cancelled",
  "products/create", "products/update", "products/delete",
  "customers/create", "customers/update", "customers/delete",
  "carts/create", "carts/update",
  "inventory_levels/update", "inventory_levels/connect",
  "fulfillments/create", "fulfillments/update",
  "app/uninstalled",
  "shop/update",
  "themes/publish",
];

export const METAFIELD_TYPES = [
  "single_line_text_field", "multi_line_text_field",
  "number_integer", "number_decimal",
  "json", "boolean", "date", "url", "color", "rating",
] as const;

export function generateTomlConfig(config: AppConfig): string {
  const lines = [
    `name = "${config.name}"`,
    `client_id = "\${SHOPIFY_CLIENT_ID}"`,
    `application_url = "https://\${HOST}"`,
    `embedded = ${config.embedded}`,
    "",
    `[access_scopes]`,
    `scopes = "${config.scopes.join(",")}"`,
    "",
    `[auth]`,
    `redirect_urls = [ "https://\${HOST}/auth/callback", "https://\${HOST}/auth/shopify/callback" ]`,
    "",
  ];

  for (const wh of config.webhooks) {
    lines.push(`[[webhooks.subscriptions]]`);
    lines.push(`topics = [ "${wh.topic}" ]`);
    lines.push(`uri = "/api/webhooks/${wh.topic.replace("/", "-")}"`);
    lines.push("");
  }

  if (config.appProxy) {
    lines.push(`[app_proxy]`);
    lines.push(`url = "https://\${HOST}/api/proxy"`);
    lines.push(`subpath = "${config.appProxy.subpath}"`);
    lines.push(`prefix = "${config.appProxy.prefix}"`);
    lines.push("");
  }

  return lines.join("\n");
}

export function generateWebhookHandler(webhook: WebhookConfig): string {
  const fnName = webhook.topic.replace("/", "_").replace(/[^a-zA-Z0-9_]/g, "");
  return `import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;

function verifyWebhook(body: string, hmac: string): boolean {
  const hash = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256") || "";

  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const shop = request.headers.get("x-shopify-shop-domain");

  console.log("[webhook:${webhook.topic}]", { shop, id: payload.id });

  // TODO: Process ${webhook.topic} event
  // Example: await db.insert("webhook_events", { topic: "${webhook.topic}", shop, payload });

  return NextResponse.json({ success: true });
}
`;
}

export function generateMetafieldDefinitionMutation(mf: MetafieldConfig): string {
  const validations = mf.validations
    ? mf.validations.map((v) => `{ name: "${v.name}", value: "${v.value}" }`).join(", ")
    : "";

  return `mutation {
  metafieldDefinitionCreate(definition: {
    name: "${mf.name}"
    namespace: "${mf.namespace}"
    key: "${mf.key}"
    type: "${mf.type}"
    description: "${mf.description}"
    ownerType: ${mf.ownerType}
    ${validations ? `validations: [${validations}]` : ""}
  }) {
    createdDefinition { id name namespace key }
    userErrors { field message }
  }
}`;
}

export function generateEnvTemplate(config: AppConfig): string {
  return `# Shopify Custom App — ${config.name}
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_APP_URL=https://your-app.vercel.app
SHOPIFY_SCOPES=${config.scopes.join(",")}
HOST=your-app.vercel.app
DATABASE_URL=
`;
}

export function generateFullScaffold(config: AppConfig) {
  const toml = generateTomlConfig(config);
  const env = generateEnvTemplate(config);
  const webhookHandlers: Record<string, string> = {};
  for (const wh of config.webhooks) {
    webhookHandlers[wh.topic] = generateWebhookHandler(wh);
  }
  const metafieldMutations = config.metafields.map(generateMetafieldDefinitionMutation);

  return {
    "shopify.app.toml": toml,
    ".env.example": env,
    webhookHandlers,
    metafieldMutations,
    summary: {
      name: config.name,
      scopes: config.scopes.length,
      webhooks: config.webhooks.length,
      metafields: config.metafields.length,
      embedded: config.embedded,
    },
  };
}
