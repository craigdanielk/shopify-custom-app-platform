"use client";

import { useState, useCallback } from "react";

const SCOPES = [
  "read_products", "write_products", "read_orders", "write_orders",
  "read_customers", "write_customers", "read_inventory", "write_inventory",
  "read_fulfillments", "write_fulfillments", "read_themes", "write_themes",
  "read_content", "write_content", "read_discounts", "write_discounts",
];

const WEBHOOK_TOPICS = [
  "orders/create", "orders/updated", "orders/paid", "orders/fulfilled",
  "products/create", "products/update", "products/delete",
  "customers/create", "customers/update",
  "inventory_levels/update", "app/uninstalled",
];

const METAFIELD_TYPES = [
  "single_line_text_field", "multi_line_text_field", "number_integer",
  "number_decimal", "json", "boolean", "date", "url", "color",
];

type Tab = "config" | "webhooks" | "metafields" | "output";

interface MetafieldDef {
  namespace: string;
  key: string;
  type: string;
  ownerType: string;
  name: string;
  description: string;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("config");
  const [appName, setAppName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [embedded, setEmbedded] = useState(true);
  const [selectedWebhooks, setSelectedWebhooks] = useState<string[]>([]);
  const [metafields, setMetafields] = useState<MetafieldDef[]>([]);
  const [mfForm, setMfForm] = useState<MetafieldDef>({ namespace: "custom", key: "", type: "single_line_text_field", ownerType: "PRODUCT", name: "", description: "" });
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const toggleScope = useCallback((scope: string) => {
    setSelectedScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  }, []);

  const toggleWebhook = useCallback((topic: string) => {
    setSelectedWebhooks((prev) => prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]);
  }, []);

  const addMetafield = useCallback(() => {
    if (!mfForm.key || !mfForm.name) return;
    setMetafields((prev) => [...prev, { ...mfForm }]);
    setMfForm({ namespace: "custom", key: "", type: "single_line_text_field", ownerType: "PRODUCT", name: "", description: "" });
  }, [mfForm]);

  const handleGenerate = useCallback(async () => {
    if (!appName) { setError("App name required"); return; }
    if (!selectedScopes.length) { setError("Select at least one scope"); return; }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName,
          scopes: selectedScopes,
          embedded,
          webhooks: selectedWebhooks.map((t) => ({ topic: t, handler: t.replace("/", "_"), format: "json" })),
          metafields,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOutput(data);
      setTab("output");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  }, [appName, selectedScopes, embedded, selectedWebhooks, metafields]);

  const downloadFile = useCallback((filename: string, content: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = filename;
    a.click();
  }, []);

  const tabs: Tab[] = ["config", "webhooks", "metafields", "output"];

  return (
    <main className="flex-1 flex flex-col font-sans">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-medium tracking-[-0.02em]">Shopify Custom App Platform</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure scopes, webhooks, metafields &rarr; Generate deployable app scaffold</p>
        </div>
      </header>

      <nav className="border-b border-zinc-800 px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${tab === t ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          {tab === "config" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                <h2 className="text-lg tracking-tight">App Configuration</h2>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">App Name</label>
                  <input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="my-custom-app" className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-400">Embedded App</label>
                  <button onClick={() => setEmbedded(!embedded)} className={`w-10 h-5 rounded-full relative transition-colors ${embedded ? "bg-emerald-500" : "bg-zinc-700"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${embedded ? "left-5" : "left-0.5"}`} />
                  </button>
                  <span className="text-xs text-zinc-500">{embedded ? "Yes" : "No"}</span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-sm font-medium mb-3">API Scopes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SCOPES.map((scope) => (
                    <button key={scope} onClick={() => toggleScope(scope)}
                      className={`text-xs font-mono px-3 py-1.5 rounded-md border transition-colors ${
                        selectedScopes.includes(scope) ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}>{scope}</button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-3">{selectedScopes.length} scope{selectedScopes.length !== 1 && "s"} selected</p>
              </div>

              <button onClick={() => setTab("webhooks")} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200">
                Next: Webhooks
              </button>
            </div>
          )}

          {tab === "webhooks" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg tracking-tight mb-4">Webhook Subscriptions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {WEBHOOK_TOPICS.map((topic) => (
                    <button key={topic} onClick={() => toggleWebhook(topic)}
                      className={`text-xs font-mono px-3 py-2 rounded-md border text-left transition-colors ${
                        selectedWebhooks.includes(topic) ? "bg-white text-black border-white" : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500"
                      }`}>{topic}</button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-3">{selectedWebhooks.length} webhook{selectedWebhooks.length !== 1 && "s"} selected. Each gets an HMAC-verified handler.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTab("metafields")} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200">Next: Metafields</button>
                <button onClick={() => setTab("config")} className="px-4 py-2 border border-zinc-700 text-sm rounded-md hover:bg-zinc-800">Back</button>
              </div>
            </div>
          )}

          {tab === "metafields" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 space-y-4">
                <h2 className="text-lg tracking-tight">Metafield Definitions</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Name</label>
                    <input value={mfForm.name} onChange={(e) => setMfForm({ ...mfForm, name: e.target.value })} placeholder="Display Name" className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Namespace</label>
                    <input value={mfForm.namespace} onChange={(e) => setMfForm({ ...mfForm, namespace: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Key</label>
                    <input value={mfForm.key} onChange={(e) => setMfForm({ ...mfForm, key: e.target.value })} placeholder="my_field" className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Type</label>
                    <select value={mfForm.type} onChange={(e) => setMfForm({ ...mfForm, type: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500">
                      {METAFIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">Owner</label>
                    <select value={mfForm.ownerType} onChange={(e) => setMfForm({ ...mfForm, ownerType: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-zinc-500">
                      {["PRODUCT", "VARIANT", "CUSTOMER", "ORDER", "SHOP"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={addMetafield} disabled={!mfForm.key || !mfForm.name} className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50">Add</button>
                  </div>
                </div>

                {metafields.length > 0 && (
                  <div className="mt-4 rounded-lg border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-zinc-800/50 border-b border-zinc-800">
                        <th className="text-left px-3 py-2 text-xs text-zinc-400">Name</th>
                        <th className="text-left px-3 py-2 text-xs text-zinc-400 font-mono">namespace.key</th>
                        <th className="text-left px-3 py-2 text-xs text-zinc-400">Type</th>
                        <th className="text-left px-3 py-2 text-xs text-zinc-400">Owner</th>
                        <th className="px-3 py-2"></th>
                      </tr></thead>
                      <tbody>
                        {metafields.map((mf, i) => (
                          <tr key={i} className="border-b border-zinc-800/50">
                            <td className="px-3 py-2">{mf.name}</td>
                            <td className="px-3 py-2 font-mono text-xs text-zinc-400">{mf.namespace}.{mf.key}</td>
                            <td className="px-3 py-2 text-xs text-zinc-500">{mf.type}</td>
                            <td className="px-3 py-2 text-xs">{mf.ownerType}</td>
                            <td className="px-3 py-2"><button onClick={() => setMetafields((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-300">Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={handleGenerate} disabled={generating || !appName || !selectedScopes.length}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-zinc-200 disabled:opacity-50">
                  {generating ? "Generating..." : "Generate App Scaffold"}
                </button>
                <button onClick={() => setTab("webhooks")} className="px-4 py-2 border border-zinc-700 text-sm rounded-md hover:bg-zinc-800">Back</button>
              </div>
            </div>
          )}

          {tab === "output" && output && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries((output as { summary?: Record<string, unknown> }).summary || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-xs text-zinc-500">{k}</p>
                    <p className="text-lg font-medium font-mono mt-1">{String(v)}</p>
                  </div>
                ))}
              </div>

              {/* TOML */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">shopify.app.toml</h3>
                  <button onClick={() => downloadFile("shopify.app.toml", (output as Record<string, string>)["shopify.app.toml"])} className="text-xs text-zinc-400 hover:text-white">Download</button>
                </div>
                <pre className="font-mono text-xs text-zinc-400 overflow-auto max-h-64 whitespace-pre-wrap">{(output as Record<string, string>)["shopify.app.toml"]}</pre>
              </div>

              {/* Env */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">.env.example</h3>
                  <button onClick={() => downloadFile(".env.example", (output as Record<string, string>)[".env.example"])} className="text-xs text-zinc-400 hover:text-white">Download</button>
                </div>
                <pre className="font-mono text-xs text-zinc-400 overflow-auto max-h-48 whitespace-pre-wrap">{(output as Record<string, string>)[".env.example"]}</pre>
              </div>

              {/* Webhook handlers */}
              {(output as { webhookHandlers?: Record<string, string> }).webhookHandlers && Object.keys((output as { webhookHandlers: Record<string, string> }).webhookHandlers).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-sm font-medium mb-3">Webhook Handlers</h3>
                  {Object.entries((output as { webhookHandlers: Record<string, string> }).webhookHandlers).map(([topic, code]) => (
                    <details key={topic} className="mb-2">
                      <summary className="text-xs font-mono text-zinc-400 cursor-pointer hover:text-white py-1">{topic}</summary>
                      <pre className="font-mono text-xs text-zinc-500 mt-1 overflow-auto max-h-48 whitespace-pre-wrap pl-4">{code}</pre>
                    </details>
                  ))}
                </div>
              )}

              {/* Metafield mutations */}
              {(output as { metafieldMutations?: string[] }).metafieldMutations && ((output as { metafieldMutations: string[] }).metafieldMutations).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-sm font-medium mb-3">Metafield GraphQL Mutations</h3>
                  {((output as { metafieldMutations: string[] }).metafieldMutations).map((mutation, i) => (
                    <pre key={i} className="font-mono text-xs text-zinc-500 mb-3 overflow-auto whitespace-pre-wrap">{mutation}</pre>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setTab("config")} className="px-4 py-2 border border-zinc-700 text-sm rounded-md hover:bg-zinc-800">Start Over</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-zinc-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex justify-between text-xs text-zinc-600">
          <span>Shopify Custom App Platform</span>
          <span className="font-mono">Scaffold Generator</span>
        </div>
      </footer>
    </main>
  );
}
