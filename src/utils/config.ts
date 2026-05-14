import path from "node:path";
import fs from "node:fs/promises";
import { z } from "zod";

const SAFESANDBOX_DIR = ".safesandbox";
const META_FILE = "meta.json";
const CONFIG_FILE = "config.json";

export const SnapshotMetaSchema = z.object({
  id: z.number(),
  commit: z.string(),
  timestamp: z.string(),
  reason: z.string(),
  filesChanged: z.number(),
});

export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;

export const MetaSchema = z.object({
  version: z.number(),
  snapshots: z.array(SnapshotMetaSchema),
});

export type Meta = z.infer<typeof MetaSchema>;

export const ConfigSchema = z.object({
  thresholdFiles: z.number().default(5),
  thresholdSeconds: z.number().default(10),
  maxSnapshots: z.number().default(200),
  ignoredPaths: z.array(z.string()).default([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".safesandbox",
  ]),
});

export type Config = z.infer<typeof ConfigSchema>;

export const getConfigDir = (cwd: string): string => path.join(cwd, SAFESANDBOX_DIR);

export const assertInitialized = async (cwd: string): Promise<void> => {
  const dir = getConfigDir(cwd);
  try {
    await fs.access(dir);
  } catch {
    throw new Error('SafeSandbox not initialized. Run "safesandbox init" first.');
  }
};

export const loadMeta = async (cwd: string): Promise<Meta> => {
  const file = path.join(getConfigDir(cwd), META_FILE);
  const raw = await fs.readFile(file, "utf-8");
  return MetaSchema.parse(JSON.parse(raw));
};

export const saveMeta = async (cwd: string, meta: Meta): Promise<void> => {
  const dir = getConfigDir(cwd);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, META_FILE);
  await fs.writeFile(file, JSON.stringify(meta, null, 2));
};

export const loadConfig = async (cwd: string): Promise<Config> => {
  const file = path.join(getConfigDir(cwd), CONFIG_FILE);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return ConfigSchema.parse(JSON.parse(raw));
  } catch {
    return ConfigSchema.parse({});
  }
};

export const saveConfig = async (cwd: string, config: Config): Promise<void> => {
  const dir = getConfigDir(cwd);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, CONFIG_FILE);
  await fs.writeFile(file, JSON.stringify(config, null, 2));
};
