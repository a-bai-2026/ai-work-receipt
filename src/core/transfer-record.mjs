import { buildCompensation, getWorkProfileCopy } from "./presentation.mjs";

function compactPresentation(record) {
  const profileId = record.presentation.work_profile;
  const scope = record.source?.scope || (record.presentation.compensation?.label === "本日工资" ? "today" : "latest");
  const mobileProfile = profileId
    ? getWorkProfileCopy(profileId, "zh-CN")
    : { title: record.presentation.work_title, review: record.presentation.review };
  const mobileCompensation = profileId
    ? buildCompensation(scope, record.presentation.compensation?.amount, "zh-CN")
    : record.presentation.compensation;

  return {
    profileId,
    scope,
    mobileProfile,
    mobileCompensation,
  };
}

function compactBase(record) {
  const presentation = compactPresentation(record);
  return {
    v: record.schema_version,
    i: record.id,
    g: record.generated_at,
    o: presentation.scope,
    d: [
      record.period.start_at,
      record.period.end_at,
      record.period.timezone,
      record.period.range_start_date || null,
      record.period.range_end_date || null,
    ],
    s: [
      record.stats.session_count,
      record.stats.completed_turns,
      record.stats.user_messages,
      record.stats.tool_calls,
      record.stats.interruptions,
      record.stats.work_duration_ms,
      record.stats.average_first_token_ms,
    ],
    t: [
      record.stats.tokens.input_tokens,
      record.stats.tokens.cached_input_tokens,
      record.stats.tokens.output_tokens,
      record.stats.tokens.reasoning_output_tokens,
      record.stats.tokens.total_tokens,
    ],
    m: record.stats.models,
    l: record.locale || "zh-CN",
    r: presentation.profileId || null,
    p: [
      record.presentation.default_theme,
      presentation.mobileProfile.title,
      presentation.mobileProfile.review,
      presentation.mobileCompensation
        ? [
            presentation.mobileCompensation.label,
            presentation.mobileCompensation.amount,
            presentation.mobileCompensation.unit,
            presentation.mobileCompensation.note,
            presentation.mobileCompensation.formula_version,
          ]
        : null,
    ],
  };
}

function compactFact(fact) {
  const stats = fact.stats;
  return [
    fact.fact_id,
    fact.session_id,
    fact.identity_quality,
    fact.source_type,
    fact.local_date,
    fact.bucket_start_at,
    fact.bucket_end_at,
    fact.source_watermark_at,
    fact.observed_at,
    [
      fact.source_revision.kind,
      fact.source_revision.row_count,
      fact.source_revision.byte_length,
      fact.source_revision.tail_hash,
    ],
    fact.content_hash,
    [
      stats.completed_turns,
      stats.user_messages,
      stats.tool_calls,
      stats.interruptions,
      stats.work_duration_ms,
      stats.first_token_total_ms,
      stats.first_token_sample_count,
      stats.input_tokens,
      stats.cached_input_tokens,
      stats.output_tokens,
      stats.reasoning_output_tokens,
      stats.total_tokens,
      stats.token_reset_count,
      stats.models,
    ],
  ];
}

export function compactReceipt(record) {
  const compact = compactBase(record);
  if (record.schema_version !== 2) return compact;

  const coverage = record.manifest.coverage;
  return {
    ...compact,
    k: record.source.logical_key,
    h: record.source.snapshot_hash,
    a: [
      record.manifest.version,
      record.manifest.fact_schema_version,
      record.manifest.metric_schema_version,
      record.manifest.accounting_timezone,
      record.manifest.fact_count,
      record.manifest.fact_ids,
      [
        coverage.kind,
        coverage.scan_mode,
        coverage.start_date || null,
        coverage.end_date || null,
        coverage.complete_through_date || null,
        coverage.observed_through_at,
      ],
      record.manifest.manifest_hash,
    ],
    f: record.facts.map(compactFact),
  };
}
