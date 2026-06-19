// redis.crud.ts
import { redisConfig } from '../upstash';

interface CreateConfig {
  key: string;
  data: unknown;
  ttl?: number; // in seconds, optional
}

interface UpdateConfig {
  key: string;
  data: unknown;
  ttl?: number;
}

interface DeleteConfig {
  key: string;
}

interface GetConfig {
  key: string;
}

export async function create({ key, data, ttl }: CreateConfig) {
  try {
    if (!key || data == null) {
      throw new Error('Key and data are required');
    }

    const exists = await redisConfig.exists(key);
    if (exists) {
      throw new Error(`Key "${key}" already exists, use update instead`);
    }

    if (ttl) {
      await redisConfig.set(key, data, { ex: ttl });
    } else {
      await redisConfig.set(key, data);
    }

    return { key, data };
  } catch (err) {
    console.error('[Redis:create]', err);
    throw err;
  }
}

export async function get<T = unknown>({ key }: GetConfig): Promise<T | null> {
  try {
    if (!key) {
      throw new Error('Key is required');
    }

    const data = await redisConfig.get<T>(key);

    if (data === null) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Redis:get]', err);
    throw err;
  }
}

export async function update({ key, data, ttl }: UpdateConfig) {
  try {
    if (!key || data == null) {
      throw new Error('Key and data are required');
    }

    const exists = await redisConfig.exists(key);
    if (!exists) {
      throw new Error(`Key "${key}" does not exist, use create instead`);
    }

    if (ttl) {
      await redisConfig.set(key, data, { ex: ttl });
    } else {
      await redisConfig.set(key, data, { keepTtl: true });
    }

    return { key, data };
  } catch (err) {
    console.error('[Redis:update]', err);
    throw err;
  }
}

export async function remove({ key }: DeleteConfig) {
  try {
    if (!key) {
      throw new Error('Key is required');
    }

    const exists = await redisConfig.exists(key);
    if (!exists) {
      throw new Error(`Key "${key}" does not exist`);
    }

    await redisConfig.del(key);

    return { key, deleted: true };
  } catch (err) {
    console.error('[Redis:remove]', err);
    throw err;
  }
}

export async function upsert({ key, data, ttl }: UpdateConfig) {
  try {
    if (!key || data == null) {
      throw new Error('Key and data are required');
    }

    if (ttl) {
      await redisConfig.set(key, data, { ex: ttl });
    } else {
      await redisConfig.set(key, data);
    }

    return { key, data };
  } catch (err) {
    console.error('[Redis:upsert]', err);
    throw err;
  }
}
