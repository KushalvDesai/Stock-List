export const serverLogs: string[] = [];
export const clientLogs: string[] = [];

let isInitialized = false;

export function initLogger() {
  if (isInitialized) return;
  isInitialized = true;

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  (process.stdout as any).write = function(chunk: any, encoding: any, cb: any) {
    serverLogs.push(chunk.toString());
    if (serverLogs.length > 1000) serverLogs.shift();
    return originalStdoutWrite(chunk, encoding, cb);
  };

  (process.stderr as any).write = function(chunk: any, encoding: any, cb: any) {
    serverLogs.push(chunk.toString());
    if (serverLogs.length > 1000) serverLogs.shift();
    return originalStderrWrite(chunk, encoding, cb);
  };
}
