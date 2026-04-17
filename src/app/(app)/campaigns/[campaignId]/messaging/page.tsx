"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface Pillar {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  valuePropositions: {
    id: string;
    statement: string;
    supporting_proof: string | null;
    differentiator: string | null;
  }[];
}

interface KeyMessage {
  id: string;
  message: string;
  audience_segment: string | null;
  channel: string | null;
  funnel_stage: string | null;
  rationale: string | null;
}

interface Framework {
  id: string;
  positioning_statement: string | null;
  brand_voice: Record<string, unknown> | null;
  tagline: string | null;
  elevator_pitch: string | null;
}

export default function MessagingPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const [framework, setFramework] = useState<Framework | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [keyMessages, setKeyMessages] = useState<KeyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Framework fields
  const [positioning, setPositioning] = useState("");
  const [tagline, setTagline] = useState("");
  const [elevatorPitch, setElevatorPitch] = useState("");
  const [toneTags, setToneTags] = useState("");
  const [personality, setPersonality] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Load or create framework
    let { data: fw } = await supabase
      .from("messaging_frameworks")
      .select("*")
      .eq("campaign_id", campaignId)
      .single();

    if (!fw) {
      const { data: newFw } = await supabase
        .from("messaging_frameworks")
        .insert({ campaign_id: campaignId })
        .select()
        .single();
      fw = newFw;
    }

    if (fw) {
      setFramework(fw);
      setPositioning(fw.positioning_statement ?? "");
      setTagline(fw.tagline ?? "");
      setElevatorPitch(fw.elevator_pitch ?? "");
      const bv = (fw.brand_voice as Record<string, unknown>) ?? {};
      setToneTags(
        Array.isArray(bv.tone) ? (bv.tone as string[]).join(", ") : ""
      );
      setPersonality((bv.personality as string) ?? "");

      // Load pillars with value props
      const { data: pls } = await supabase
        .from("messaging_pillars")
        .select("id, name, description, sort_order")
        .eq("framework_id", fw.id)
        .order("sort_order");

      const pillarsWithVPs = await Promise.all(
        (pls ?? []).map(async (p) => {
          const { data: vps } = await supabase
            .from("value_propositions")
            .select("id, statement, supporting_proof, differentiator")
            .eq("pillar_id", p.id)
            .order("sort_order");
          return { ...p, valuePropositions: vps ?? [] };
        })
      );
      setPillars(pillarsWithVPs);

      // Load key messages
      const { data: kms } = await supabase
        .from("key_messages")
        .select("*")
        .eq("framework_id", fw.id)
        .order("sort_order");
      setKeyMessages(kms ?? []);
    }

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveFramework() {
    if (!framework) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("messaging_frameworks")
      .update({
        positioning_statement: positioning || null,
        tagline: tagline || null,
        elevator_pitch: elevatorPitch || null,
        brand_voice: {
          tone: toneTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          personality: personality || null,
        },
      })
      .eq("id", framework.id);

    setSaving(false);
  }

  async function addPillar() {
    if (!framework) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("messaging_pillars")
      .insert({
        framework_id: framework.id,
        name: "New Pillar",
        sort_order: pillars.length,
      })
      .select()
      .single();
    if (data) {
      setPillars([...pillars, { ...data, valuePropositions: [] }]);
    }
  }

  async function updatePillar(id: string, updates: Partial<Pillar>) {
    const supabase = createClient();
    await supabase.from("messaging_pillars").update(updates).eq("id", id);
    setPillars(pillars.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function deletePillar(id: string) {
    const supabase = createClient();
    await supabase.from("messaging_pillars").delete().eq("id", id);
    setPillars(pillars.filter((p) => p.id !== id));
  }

  async function addValueProp(pillarId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("value_propositions")
      .insert({
        pillar_id: pillarId,
        statement: "",
        sort_order:
          pillars.find((p) => p.id === pillarId)?.valuePropositions.length ?? 0,
      })
      .select()
      .single();
    if (data) {
      setPillars(
        pillars.map((p) =>
          p.id === pillarId
            ? { ...p, valuePropositions: [...p.valuePropositions, data] }
            : p
        )
      );
    }
  }

  async function updateValueProp(
    pillarId: string,
    vpId: string,
    updates: Record<string, unknown>
  ) {
    const supabase = createClient();
    await supabase.from("value_propositions").update(updates).eq("id", vpId);
    setPillars(
      pillars.map((p) =>
        p.id === pillarId
          ? {
              ...p,
              valuePropositions: p.valuePropositions.map((vp) =>
                vp.id === vpId ? { ...vp, ...updates } : vp
              ),
            }
          : p
      )
    );
  }

  async function deleteValueProp(pillarId: string, vpId: string) {
    const supabase = createClient();
    await supabase.from("value_propositions").delete().eq("id", vpId);
    setPillars(
      pillars.map((p) =>
        p.id === pillarId
          ? {
              ...p,
              valuePropositions: p.valuePropositions.filter(
                (vp) => vp.id !== vpId
              ),
            }
          : p
      )
    );
  }

  async function addKeyMessage() {
    if (!framework) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("key_messages")
      .insert({
        framework_id: framework.id,
        message: "",
        sort_order: keyMessages.length,
      })
      .select()
      .single();
    if (data) {
      setKeyMessages([...keyMessages, data]);
    }
  }

  async function updateKeyMessage(
    id: string,
    updates: Record<string, unknown>
  ) {
    const supabase = createClient();
    await supabase.from("key_messages").update(updates).eq("id", id);
    setKeyMessages(
      keyMessages.map((km) => (km.id === id ? { ...km, ...updates } : km))
    );
  }

  async function deleteKeyMessage(id: string) {
    const supabase = createClient();
    await supabase.from("key_messages").delete().eq("id", id);
    setKeyMessages(keyMessages.filter((km) => km.id !== id));
  }

  if (loading) {
    return <div className="animate-pulse text-sm text-zinc-500">Loading messaging framework...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Messaging Framework
        </h1>
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Back to campaign
        </button>
      </div>

      {/* Positioning & Brand Voice */}
      <section className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Brand & Positioning</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Positioning Statement
            </label>
            <textarea
              value={positioning}
              onChange={(e) => setPositioning(e.target.value)}
              onBlur={saveFramework}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="For [target audience] who [need], [product] is a [category] that [key benefit]..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                onBlur={saveFramework}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="Your campaign tagline"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tone (comma-separated)
              </label>
              <input
                type="text"
                value={toneTags}
                onChange={(e) => setToneTags(e.target.value)}
                onBlur={saveFramework}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                placeholder="professional, confident, approachable"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Personality</label>
            <input
              type="text"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              onBlur={saveFramework}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Describe the brand's personality in a sentence"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Elevator Pitch</label>
            <textarea
              value={elevatorPitch}
              onChange={(e) => setElevatorPitch(e.target.value)}
              onBlur={saveFramework}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="30-second pitch for this campaign"
            />
          </div>
        </div>

        {saving && (
          <p className="text-xs text-zinc-400">Saving...</p>
        )}
      </section>

      {/* Messaging Pillars */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Messaging Pillars</h2>
          <button
            onClick={addPillar}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add Pillar
          </button>
        </div>

        {pillars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">
              No messaging pillars yet. Add one to organize your value
              propositions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pillars.map((pillar) => (
              <div
                key={pillar.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <input
                    type="text"
                    value={pillar.name}
                    onChange={(e) =>
                      updatePillar(pillar.id, { name: e.target.value })
                    }
                    className="flex-1 border-b border-transparent bg-transparent text-sm font-semibold focus:border-zinc-400 focus:outline-none"
                    placeholder="Pillar name"
                  />
                  <button
                    onClick={() => deletePillar(pillar.id)}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="text"
                  value={pillar.description ?? ""}
                  onChange={(e) =>
                    updatePillar(pillar.id, { description: e.target.value })
                  }
                  className="mt-1 w-full border-b border-transparent bg-transparent text-sm text-zinc-500 focus:border-zinc-400 focus:outline-none"
                  placeholder="Brief description of this pillar"
                />

                {/* Value Propositions */}
                <div className="mt-3 space-y-2">
                  {pillar.valuePropositions.map((vp) => (
                    <div
                      key={vp.id}
                      className="flex items-start gap-2 rounded bg-zinc-50 p-2 dark:bg-zinc-900"
                    >
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={vp.statement}
                          onChange={(e) =>
                            updateValueProp(pillar.id, vp.id, {
                              statement: e.target.value,
                            })
                          }
                          className="w-full bg-transparent text-sm focus:outline-none"
                          placeholder="Value proposition statement"
                        />
                        <div className="grid gap-1 sm:grid-cols-2">
                          <input
                            type="text"
                            value={vp.supporting_proof ?? ""}
                            onChange={(e) =>
                              updateValueProp(pillar.id, vp.id, {
                                supporting_proof: e.target.value,
                              })
                            }
                            className="bg-transparent text-xs text-zinc-500 focus:outline-none"
                            placeholder="Proof point"
                          />
                          <input
                            type="text"
                            value={vp.differentiator ?? ""}
                            onChange={(e) =>
                              updateValueProp(pillar.id, vp.id, {
                                differentiator: e.target.value,
                              })
                            }
                            className="bg-transparent text-xs text-zinc-500 focus:outline-none"
                            placeholder="Differentiator"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => deleteValueProp(pillar.id, vp.id)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addValueProp(pillar.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    + Add value proposition
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Key Messages */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Key Messages</h2>
          <button
            onClick={addKeyMessage}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add Message
          </button>
        </div>

        {keyMessages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500">
              No key messages yet. Add messages to maintain consistency across
              all content.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {keyMessages.map((km) => (
              <div
                key={km.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start gap-2">
                  <textarea
                    value={km.message}
                    onChange={(e) =>
                      updateKeyMessage(km.id, { message: e.target.value })
                    }
                    rows={2}
                    className="flex-1 rounded border border-transparent bg-transparent text-sm focus:border-zinc-400 focus:outline-none"
                    placeholder="Key message..."
                  />
                  <button
                    onClick={() => deleteKeyMessage(km.id)}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    value={km.audience_segment ?? ""}
                    onChange={(e) =>
                      updateKeyMessage(km.id, {
                        audience_segment: e.target.value || null,
                      })
                    }
                    className="rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs focus:outline-none dark:border-zinc-700"
                    placeholder="Audience segment"
                  />
                  <input
                    type="text"
                    value={km.channel ?? ""}
                    onChange={(e) =>
                      updateKeyMessage(km.id, {
                        channel: e.target.value || null,
                      })
                    }
                    className="rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs focus:outline-none dark:border-zinc-700"
                    placeholder="Channel (e.g. slack)"
                  />
                  <input
                    type="text"
                    value={km.funnel_stage ?? ""}
                    onChange={(e) =>
                      updateKeyMessage(km.id, {
                        funnel_stage: e.target.value || null,
                      })
                    }
                    className="rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs focus:outline-none dark:border-zinc-700"
                    placeholder="Funnel stage"
                  />
                </div>
                <input
                  type="text"
                  value={km.rationale ?? ""}
                  onChange={(e) =>
                    updateKeyMessage(km.id, {
                      rationale: e.target.value || null,
                    })
                  }
                  className="mt-2 w-full border-b border-transparent bg-transparent text-xs text-zinc-500 focus:border-zinc-400 focus:outline-none"
                  placeholder="Rationale for this message..."
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
