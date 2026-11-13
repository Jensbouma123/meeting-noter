import { activeAsrManifest } from './backend-detect';
import { knownModelKeys } from './model-registry-known-keys';
import { hubOptionsFor, manifestForVariant, webgpuEncoderOf, WEBGPU_ENCODER_FALLBACKS } from './model-manifest-selection';
import type { AsrBackend, AsrModelManifest } from './types/model-manifest';
import { setActiveBackend } from './model-registry-dialog';
import { persistEntries, readPersistedConsent, readPersistedEntries } from './model-registry-persistence';
import { emptyProgress, notifyListeners, registryState } from './model-registry-state';
import type { ModelEntry, ModelEntryConfig } from './types/model-registry';

export function registerModel(config: ModelEntryConfig): ModelEntry {
  const existing = registryState.entries[config.key];
  if (
    existing &&
    existing.modelRepo === config.modelRepo &&
    existing.backend === config.backend &&
    (existing.variant ?? null) === (config.variant ?? null)
  ) {
    return existing;
  }

  const entry: ModelEntry = {
    ...config,
    status: 'not-downloaded',
    progress: emptyProgress(config.estimatedSizeBytes),
    error: null,
    wasCancelled: false,
    isReady: false,
  } as ModelEntry;

  registryState.entries = { ...registryState.entries, [config.key]: entry };
  notifyListeners();
  persistEntries();
  return entry;
}

export function registerManifest(
  manifest: AsrModelManifest,
  descriptionOverride?: string,
): ModelEntry {
  return registerModel({
    key: manifest.key,
    variant: manifest.variant,
    modelRepo: manifest.modelRepo,
    displayName: manifest.displayName,
    estimatedSizeBytes: manifest.fallbackSizeBytes,
    description: descriptionOverride ?? manifest.description,
    fromHubOptions: hubOptionsFor(manifest),
    preCheckCache: true,
    backend: manifest.asrBackend,
  });
}

export function registerDefaultModels(backend: AsrBackend, descriptionOverride?: string): void {
  const manifest = activeAsrManifest(backend);
  setActiveBackend(backend);
  registerManifest(manifest, descriptionOverride);
}

export function getModelStatus(key: string): ModelEntry | undefined {
  return registryState.entries[key];
}

function repointUnavailableWebgpuEntries(): void {
  for (const [key, entry] of Object.entries(registryState.entries)) {
    if ((entry.kind ?? 'asr') !== 'asr' || entry.status === 'cached') continue;
    const saved = manifestForVariant(entry.variant);
    if (!saved || saved.engine !== 'parakeet') continue;
    const encoder = webgpuEncoderOf(saved);
    if (encoder === null || WEBGPU_ENCODER_FALLBACKS.includes(encoder)) continue;
    const active = activeAsrManifest('wasm');
    delete registryState.entries[key];
    registerManifest(
      active,
      `The ${encoder.toUpperCase()} speech model isn't available here, so this uses the CPU model instead.`,
    );
  }
}

function pruneUnknownEntries(entries: Record<string, ModelEntry>): Record<string, ModelEntry> {
  const known = knownModelKeys();
  return Object.fromEntries(Object.entries(entries).filter(([key]) => known.has(key)));
}

export function initRegistry(): void {
  if (typeof window === 'undefined') return;
  registryState.persistedConsent = readPersistedConsent();
  const persisted = readPersistedEntries();
  registryState.entries = pruneUnknownEntries(persisted);
  for (const entry of Object.values(registryState.entries)) {
    entry.isReady = entry.status === 'cached';
  }
  if (Object.keys(registryState.entries).length !== Object.keys(persisted).length) persistEntries();
  repointUnavailableWebgpuEntries();
}
