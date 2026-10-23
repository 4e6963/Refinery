import * as Comlink from 'comlink'
import type { WorkerApi } from '../worker'

let client: Comlink.Remote<WorkerApi> | undefined

/** Lazily started background worker that does all PDF and Excel work. */
export function worker(): Comlink.Remote<WorkerApi> {
  client ??= Comlink.wrap<WorkerApi>(
    new Worker(new URL('../worker/index.ts', import.meta.url), { type: 'module' }),
  )
  return client
}

export { Comlink }
